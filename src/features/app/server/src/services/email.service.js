const { Resend } = require('resend');

class EmailService {
  constructor() {
    this.resend = process.env.RESEND_API_KEY 
      ? new Resend(process.env.RESEND_API_KEY)
      : null;
    this.fromEmail = process.env.EMAIL_FROM || 'Relativity <noreply@relativity.app>';
    this.isDev = process.env.NODE_ENV !== 'production';
  }

  /**
   * Send verification code email
   */
  async sendVerificationCode(email, code, type = 'login') {
    const subject = {
      login: 'Your Relativity login code',
      email_verification: 'Verify your email - Relativity',
      password_reset: 'Reset your password - Relativity'
    }[type] || 'Your Relativity verification code';

    const html = this.getVerificationEmailHtml(code, type);
    
    return this.send(email, subject, html);
  }

  /**
   * Send welcome email after registration
   */
  async sendWelcomeEmail(email, name) {
    const subject = 'Welcome to Relativity';
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
      console.log(`   Code: ${html.includes('677485') ? '677485 (Demo Mode)' : 'See email template'}`);
      console.log('   (Email content logged, not sent in dev mode)\n');
      return { success: true, dev: true };
    }

    if (!this.resend) {
      console.warn('Email service not configured (RESEND_API_KEY missing)');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject,
        html
      });

      return { success: true, id: result.id };
    } catch (error) {
      console.error('Failed to send email:', error);
      return { success: false, error: error.message };
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
              <h1 style="color: #f8fafc; font-size: 24px; margin: 16px 0 0 0; font-weight: 600;">Relativity</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="background-color: rgba(255,255,255,0.03); border-radius: 16px; padding: 40px; border: 1px solid rgba(255,255,255,0.06);">
              <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0; text-align: center;">
                Enter this code to ${actionText} Relativity:
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
                © ${new Date().getFullYear()} Relativity. All rights reserved.
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
  <title>Welcome to Relativity</title>
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
              <h1 style="color: #f8fafc; font-size: 24px; margin: 16px 0 0 0; font-weight: 600;">Relativity</h1>
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
                <a href="${process.env.APP_URL || 'https://relativity.app'}" 
                   style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 14px;">
                  Open Relativity
                </a>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding-top: 32px; text-align: center;">
              <p style="color: #475569; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Relativity. All rights reserved.
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
