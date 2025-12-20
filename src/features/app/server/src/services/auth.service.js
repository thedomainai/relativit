const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');
const emailService = require('./email.service');
const { hashPassword, verifyPassword, generateVerificationCode, generateSecureToken, encrypt } = require('../utils/encryption');

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

class AuthService {
  /**
   * Request verification code (for login or signup)
   */
  async requestVerificationCode(email, type = 'login') {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    // Generate verification code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing codes for this email
    await prisma.verificationCode.deleteMany({
      where: { email: normalizedEmail, type }
    });

    // Create new code
    await prisma.verificationCode.create({
      data: {
        email: normalizedEmail,
        userId: existingUser?.id,
        code,
        type,
        expiresAt
      }
    });

    // Send email (dev mode logs instead)
    const emailResult = await emailService.sendVerificationCode(normalizedEmail, code, type);
    
    // Log email result for debugging
    if (!emailResult.success) {
      console.error('Email sending failed:', emailResult.error);
      console.error('Email details:', emailResult.details);
      // In production, fail if email cannot be sent
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Failed to send verification email: ${emailResult.error}`);
      }
      // In development, log but continue (email might be logged to console)
      console.warn('Email sending failed in development mode, but continuing...');
    }

    return {
      userExists: !!existingUser,
      email: normalizedEmail
    };
  }

  /**
   * Verify code and return user status
   */
  async verifyCode(email, code, ipAddress, userAgent) {
    const normalizedEmail = email.toLowerCase().trim();

    // Normal verification flow
    const verification = await prisma.verificationCode.findFirst({
      where: {
        email: normalizedEmail,
        code,
        usedAt: null,
        expiresAt: { gt: new Date() }
      }
    });

    if (!verification) {
      throw new Error('Invalid or expired verification code');
    }

    // Mark code as used
    await prisma.verificationCode.update({
      where: { id: verification.id },
      data: { usedAt: new Date() }
    });

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (user) {
      // Existing user - generate tokens
      const { accessToken, refreshToken } = await this.generateTokens(user, ipAddress, userAgent);
      
      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });

      // Log audit
      await this.logAudit(user.id, 'login', 'user', user.id, { method: 'verification_code' }, ipAddress, userAgent);

      return {
        status: 'existing_user',
        accessToken,
        refreshToken,
        user: this.sanitizeUser(user)
      };
    }

    // New user - return verified email
    return {
      status: 'new_user',
      email: normalizedEmail,
      verified: true
    };
  }

  /**
   * Complete registration for new user
   * Demo mode: skips strict verification check
   */
  async register(email, name, password, ipAddress, userAgent) {
    const normalizedEmail = email.toLowerCase().trim();

    // In demo mode, we skip strict verification-code checks
    // Verify that email was verified recently
    const recentVerification = await prisma.verificationCode.findFirst({
      where: {
        email: normalizedEmail,
        usedAt: { not: null },
        expiresAt: { gt: new Date(Date.now() - 15 * 60 * 1000) } // Within last 15 mins
      }
    });

    if (!recentVerification) {
      throw new Error('Email not verified. Please start the signup process again.');
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existing) {
      throw new Error('An account with this email already exists');
    }

    // Validate password
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    // Create user
    const hashedPassword = hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: name.trim(),
        password: hashedPassword,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        lastLoginAt: new Date()
      }
    });

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(user, ipAddress, userAgent);

    // Send welcome email
    await emailService.sendWelcomeEmail(normalizedEmail, name);

    // Log audit
    await this.logAudit(user.id, 'register', 'user', user.id, {}, ipAddress, userAgent);

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(user)
    };
  }

  /**
   * Login with email and password
   */
  async login(email, password, ipAddress, userAgent) {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isValid = verifyPassword(password, user.password);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(user, ipAddress, userAgent);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Log audit
    await this.logAudit(user.id, 'login', 'user', user.id, { method: 'password' }, ipAddress, userAgent);

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(user)
    };
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken) {
    // Find token
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true }
    });

    if (!storedToken) {
      throw new Error('Invalid refresh token');
    }

    if (storedToken.revokedAt) {
      throw new Error('Refresh token has been revoked');
    }

    if (storedToken.expiresAt < new Date()) {
      throw new Error('Refresh token has expired');
    }

    // Generate new access token
    const accessToken = this.generateAccessToken(storedToken.user);

    return {
      accessToken,
      user: this.sanitizeUser(storedToken.user)
    };
  }

  /**
   * Logout (revoke refresh token)
   */
  async logout(refreshToken, userId) {
    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { token: refreshToken, userId },
        data: { revokedAt: new Date() }
      });
    }

    await this.logAudit(userId, 'logout', 'user', userId, {});
  }

  /**
   * Logout from all devices
   */
  async logoutAll(userId) {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() }
    });

    await this.logAudit(userId, 'logout_all', 'user', userId, {});
  }

  /**
   * Get current user
   */
  async getCurrentUser(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    return this.sanitizeUser(user);
  }

  /**
   * Update user profile
   */
  async updateProfile(userId, data) {
    const allowedFields = ['name', 'avatar'];
    const updateData = {};

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    return this.sanitizeUser(user);
  }

  /**
   * Change password
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const isValid = verifyPassword(currentPassword, user.password);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    if (newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters');
    }

    const hashedPassword = hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    // Revoke all refresh tokens for security
    await this.logoutAll(userId);

    await this.logAudit(userId, 'password_change', 'user', userId, {});

    return { success: true };
  }

  /**
   * Save API key
   */
  async saveApiKey(userId, provider, apiKey) {
    const validProviders = ['anthropic', 'openai', 'gemini'];
    if (!validProviders.includes(provider)) {
      throw new Error('Invalid provider');
    }

    // Encrypt API key
    const { encrypted, iv } = encrypt(apiKey, process.env.ENCRYPTION_KEY);

    await prisma.user.update({
      where: { id: userId },
      data: {
        apiProvider: provider,
        apiKeyEncrypted: encrypted,
        apiKeyIv: iv
      }
    });

    await this.logAudit(userId, 'api_key_update', 'user', userId, { provider });

    return { success: true };
  }

  /**
   * Get API key status
   */
  async getApiKeyStatus(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        apiProvider: true, 
        apiKeyEncrypted: true,
        useTrialMode: true,
        trialCredits: true,
        trialStartedAt: true
      }
    });

    return {
      hasApiKey: !!user?.apiKeyEncrypted,
      provider: user?.apiProvider,
      useTrialMode: user?.useTrialMode || false,
      trialCredits: user?.trialCredits || 0,
      trialStartedAt: user?.trialStartedAt
    };
  }

  /**
   * Enable trial mode (gives user $0.50 in credits)
   */
  async enableTrialMode(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { useTrialMode: true, trialCredits: true }
    });

    // If already enabled, don't reset credits
    if (user?.useTrialMode) {
      return {
        success: true,
        trialCredits: user.trialCredits,
        alreadyEnabled: true
      };
    }

    // Enable trial mode with $0.50 credits
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        useTrialMode: true,
        trialCredits: 0.5, // $0.50 in credits
        trialStartedAt: new Date()
      }
    });

    await this.logAudit(userId, 'trial_mode_enabled', 'user', userId, { 
      credits: 0.5 
    });

    return {
      success: true,
      trialCredits: updated.trialCredits,
      trialStartedAt: updated.trialStartedAt
    };
  }

  /**
   * Remove API key
   */
  async removeApiKey(userId) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        apiProvider: null,
        apiKeyEncrypted: null,
        apiKeyIv: null
      }
    });

    await this.logAudit(userId, 'api_key_remove', 'user', userId, {});

    return { success: true };
  }

  /**
   * Helper: Generate access and refresh tokens
   */
  async generateTokens(user, ipAddress, userAgent) {
    const accessToken = this.generateAccessToken(user);
    
    const refreshTokenValue = generateSecureToken(64);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        token: refreshTokenValue,
        userId: user.id,
        expiresAt,
        ipAddress,
        userAgent
      }
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue
    };
  }

  /**
   * Helper: Generate access token
   */
  generateAccessToken(user) {
    return jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
  }

  /**
   * Helper: Verify access token
   */
  verifyAccessToken(token) {
    return jwt.verify(token, process.env.JWT_SECRET);
  }

  /**
   * Helper: Sanitize user object for response
   */
  sanitizeUser(user) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      emailVerified: user.emailVerified,
      hasApiKey: !!user.apiKeyEncrypted || !!user.useTrialMode,
      apiProvider: user.apiProvider,
      useTrialMode: user.useTrialMode || false,
      trialCredits: user.trialCredits || 0,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt
    };
  }

  /**
   * Helper: Log audit event
   */
  async logAudit(userId, action, resource, resourceId, metadata, ipAddress, userAgent) {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          resource,
          resourceId,
          metadata,
          ipAddress,
          userAgent
        }
      });
    } catch (e) {
      console.error('Failed to log audit:', e);
    }
  }
}

module.exports = new AuthService();
