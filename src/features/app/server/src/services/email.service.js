const { Resend } = require('resend');

class EmailService {
  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    
    // Log API key status (masked for security)
    if (apiKey) {
      const maskedKey = apiKey.length > 8 
        ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`
        : '***';
      console.log(`📧 Resend API Key loaded: ${maskedKey}`);
    } else {
      console.warn('⚠️  RESEND_API_KEY not found in environment variables');
    }
    
    this.resend = apiKey ? new Resend(apiKey) : null;
    
    // Use test email in development to avoid domain verification issues
    // Resend requires verified domain for production
    if (process.env.NODE_ENV !== 'production') {
      // In development, prefer test email unless explicitly set
      if (process.env.EMAIL_FROM && process.env.EMAIL_FROM.includes('@resend.dev')) {
        this.fromEmail = process.env.EMAIL_FROM;
      } else if (!process.env.EMAIL_FROM || process.env.EMAIL_FROM.includes('relativit.app')) {
        // Use Resend test email if EMAIL_FROM is not set or uses unverified domain
        this.fromEmail = 'onboarding@resend.dev';
        console.log('📧 Using Resend test email address for development (relativit.app not verified)');
        if (process.env.EMAIL_FROM) {
          console.warn(`⚠️  EMAIL_FROM (${process.env.EMAIL_FROM}) uses unverified domain, using test email instead`);
        }
      } else {
        this.fromEmail = process.env.EMAIL_FROM;
        console.log(`📧 Using EMAIL_FROM: ${this.fromEmail}`);
      }
    } else {
      // Production: use EMAIL_FROM or default
      const envEmailFrom = process.env.EMAIL_FROM;
      if (envEmailFrom) {
        // Replace any old "relativity.app" references with "relativit.app"
        this.fromEmail = envEmailFrom.replace(/relativity\.app/g, 'relativit.app');
        if (this.fromEmail !== envEmailFrom) {
          console.warn(`⚠️  EMAIL_FROM contained "relativity.app", corrected to: ${this.fromEmail}`);
        }
      } else {
        this.fromEmail = 'noreply@relativit.app';
      }
      console.log(`📧 Using EMAIL_FROM: ${this.fromEmail}`);
      console.warn('⚠️  Make sure relativit.app domain is verified in Resend dashboard for production!');
    }
    
    this.isDev = process.env.NODE_ENV !== 'production';
    
    console.log(`📧 Email service initialized:`);
    console.log(`   - From: ${this.fromEmail}`);
    console.log(`   - Dev mode: ${this.isDev}`);
    console.log(`   - Resend client: ${this.resend ? 'initialized' : 'not available'}`);
  }

  /**
   * Send verification code email
   */
  async sendVerificationCode(email, code, type = 'login') {
    const subject = {
      login: 'Your Relativit login code',
      email_verification: 'Verify your email - Relativit',
      password_reset: 'Reset your password - Relativit'
    }[type] || 'Your Relativit verification code';

    const html = this.getVerificationEmailHtml(code, type);
    
    return this.send(email, subject, html);
  }

  /**
   * Send welcome email after registration
   */
  async sendWelcomeEmail(email, name) {
    const subject = 'Welcome to Relativit';
    const html = this.getWelcomeEmailHtml(name);
    
    return this.send(email, subject, html);
  }

  /**
   * Core send method
   */
  async send(to, subject, html) {
    // In development, log instead of sending
    if (this.isDev && !this.resend) {
      console.log('\n📧 Email (Dev Mode):');
      console.log(`   To: ${to}`);
      console.log(`   Subject: ${subject}`);
      console.log(`   Code: See email template`);
      console.log('   (Email content logged, not sent in dev mode)\n');
      return { success: true, dev: true };
    }

    if (!this.resend) {
      console.warn('Email service not configured (RESEND_API_KEY missing)');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      console.log(`📧 Attempting to send email to: ${to}`);
      console.log(`   From: ${this.fromEmail}`);
      console.log(`   Subject: ${subject}`);
      
      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject,
        html
      });

      // Log successful send with full details
      const emailId = result.id || result.data?.id || 'N/A';
      console.log(`✅ Email sent successfully!`);
      console.log(`   Email ID: ${emailId}`);
      console.log(`   From: ${this.fromEmail}`);
      console.log(`   To: ${to}`);
      console.log(`   Subject: ${subject}`);
      console.log(`   Full response:`, JSON.stringify(result, null, 2));
      
      return { success: true, id: emailId };
    } catch (error) {
      console.error('❌ Failed to send email:');
      console.error('   Error type:', error.constructor.name);
      console.error('   Error message:', error.message);
      
      // Log full error object for debugging
      console.error('   Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      
      // Resend SDK error structure
      let errorMessage = error.message;
      let errorDetails = null;
      let statusCode = null;
      
      // Check for Resend SDK error structure
      // Resend SDK uses different error structures depending on version
      if (error.response) {
        statusCode = error.response.status;
        errorDetails = error.response.data;
        console.error('   Status code:', statusCode);
        console.error('   Response data:', JSON.stringify(errorDetails, null, 2));
        
        if (errorDetails) {
          if (errorDetails.message) {
            errorMessage = errorDetails.message;
          } else if (typeof errorDetails === 'string') {
            errorMessage = errorDetails;
          } else if (errorDetails.error) {
            errorMessage = errorDetails.error;
          } else {
            errorMessage = JSON.stringify(errorDetails);
          }
        }
      } else if (error.status) {
        // Alternative error structure
        statusCode = error.status;
        errorDetails = error.message || error;
        console.error('   Status code:', statusCode);
        console.error('   Error details:', errorDetails);
      } else if (error.message) {
        // Check if error message contains status code
        const statusMatch = error.message.match(/status[:\s]+(\d+)/i);
        if (statusMatch) {
          statusCode = parseInt(statusMatch[1]);
          console.error('   Status code (from message):', statusCode);
        }
      }
      
      // Special handling for 403 errors
      if (statusCode === 403 || errorMessage.includes('403') || errorMessage.toLowerCase().includes('forbidden')) {
        console.error('🔍 403 Forbidden Error - Detailed diagnosis:');
        console.error(`   Current EMAIL_FROM: "${this.fromEmail}"`);
        console.error(`   EMAIL_FROM domain: ${this.fromEmail.match(/@([^\s>]+)/)?.[1] || 'could not extract'}`);
        console.error('');
        console.error('   Possible causes:');
        console.error('   1. EMAIL_FROM domain does not match verified domain in Resend');
        console.error('   2. EMAIL_FROM format is incorrect (should be: email@domain.com or "Name <email@domain.com>")');
        console.error('   3. API key does not have permission to send from this domain');
        console.error('   4. Domain verification status changed or expired');
        console.error('   5. Domain is verified but EMAIL_FROM uses different subdomain');
        console.error('');
        console.error('   💡 Troubleshooting steps:');
        console.error('   1. Go to Resend dashboard → Domains');
        console.error('   2. Verify the exact domain name (e.g., relativit.app)');
        console.error('   3. Check if domain status shows "Verified"');
        console.error('   4. Ensure EMAIL_FROM uses the exact verified domain');
        console.error('   5. Try using simple format: noreply@relativit.app');
        console.error('   6. Or try with display name: Relativit <noreply@relativit.app>');
        console.error('');
        console.error('   📋 Example .env configuration:');
        console.error('   EMAIL_FROM=noreply@relativit.app');
        console.error('   # OR');
        console.error('   EMAIL_FROM="Relativit <noreply@relativit.app>"');
        
        errorMessage = `Email sending failed (403 Forbidden): ${errorMessage}. Please verify that EMAIL_FROM domain matches your verified domain in Resend dashboard. Current EMAIL_FROM: ${this.fromEmail}`;
      }
      
      // Special handling for 422 errors (validation)
      if (statusCode === 422 || errorMessage.includes('422')) {
        console.error('🔍 422 Validation Error - Check email format:');
        console.error(`   From: ${this.fromEmail}`);
        console.error(`   To: ${to}`);
        errorMessage = `Email validation failed: ${errorMessage}`;
      }
      
      return { 
        success: false, 
        error: errorMessage,
        details: errorDetails,
        statusCode
      };
    }
  }

  /**
   * Email templates
   */
  getVerificationEmailHtml(code, type) {
    const actionText = {
      login: 'sign in to',
      email_verification: 'verify your email for',
      password_reset: 'reset your password for'
    }[type] || 'access';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verification Code</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0f;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0f;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <div style="width: 56px; height: 56px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 14px; display: inline-flex; align-items: center; justify-content: center;">
                <span style="color: white; font-size: 24px; font-weight: bold;">R</span>
              </div>
              <h1 style="color: #f8fafc; font-size: 24px; margin: 16px 0 0 0; font-weight: 600;">Relativit</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="background-color: rgba(255,255,255,0.03); border-radius: 16px; padding: 40px; border: 1px solid rgba(255,255,255,0.06);">
              <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
                Enter this code to ${actionText} Relativit:
              </p>
              
              <!-- Code -->
              <div style="background-color: #1e293b; border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
                <span style="color: #f8fafc; font-size: 36px; font-weight: 700; letter-spacing: 8px; font-family: 'Monaco', 'Menlo', monospace;">
                  ${code}
                </span>
              </div>
              
              <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0; text-align: center;">
                This code expires in 10 minutes.<br>
                If you didn't request this code, you can safely ignore this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding-top: 32px; text-align: center;">
              <p style="color: #475569; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Relativit. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  getWelcomeEmailHtml(name) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Relativit</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0f;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0f;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <div style="width: 56px; height: 56px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 14px; display: inline-flex; align-items: center; justify-content: center;">
                <span style="color: white; font-size: 24px; font-weight: bold;">R</span>
              </div>
              <h1 style="color: #f8fafc; font-size: 24px; margin: 16px 0 0 0; font-weight: 600;">Relativit</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="background-color: rgba(255,255,255,0.03); border-radius: 16px; padding: 40px; border: 1px solid rgba(255,255,255,0.06);">
              <h2 style="color: #f8fafc; font-size: 20px; margin: 0 0 16px 0; text-align: center;">
                Welcome, ${name}! 🎉
              </h2>
              
              <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
                Your account has been created successfully. You're ready to start organizing your research with AI-powered structured thinking.
              </p>
              
              <div style="background-color: #1e293b; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <h3 style="color: #f8fafc; font-size: 14px; margin: 0 0 12px 0;">Getting Started:</h3>
                <ul style="color: #94a3b8; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                  <li>Connect your AI provider (Anthropic, OpenAI, or Gemini)</li>
                  <li>Create your first workspace</li>
                  <li>Start a conversation thread</li>
                  <li>Watch your issue tree grow automatically</li>
                </ul>
              </div>
              
              <div style="text-align: center;">
                <a href="${process.env.APP_URL || 'https://relativit.app'}" 
                   style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 14px;">
                  Open Relativit
                </a>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding-top: 32px; text-align: center;">
              <p style="color: #475569; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Relativit. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }
}

module.exports = new EmailService();
