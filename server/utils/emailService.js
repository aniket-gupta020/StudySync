import dotenv from 'dotenv';
dotenv.config();
import brevo from '@getbrevo/brevo';

const apiInstance = new brevo.TransactionalEmailsApi();
const apiKey = process.env.BREVO_API_KEY;

if (apiKey) {
    const authenticator = apiInstance.authentications['apiKey'];
    authenticator.apiKey = apiKey;
} else {
    console.warn("⚠️ BREVO_API_KEY is missing! Emails will fail.");
}

/**
 * Generates the Glassmorphism HTML Email Template
 */
const getEmailTemplate = (otp, type) => {
    let config = {
        subject: 'StudySync - Verification Code',
        title: 'StudySync',
        message: 'Use the code below to verify your account.',
        bgGradient: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
        boxBorder: 'rgba(255, 255, 255, 0.2)',
        textColor: '#ffffff'
    };

    switch (type) {
        case 'delete_account':
            config.subject = '⚠️ Confirm Account Deletion';
            config.title = 'Delete Account';
            config.message = 'You have requested to <strong style="color: #ffcccc;">permanently delete</strong> your account.';
            config.bgGradient = 'linear-gradient(135deg, #4a0404, #991b1b, #ef4444)';
            break;
        case 'login_otp':
        case 'passwordless':
            config.subject = '🔐 StudySync - Secure Login Code';
            config.title = 'Secure Login';
            config.message = 'We detected a login attempt.';
            config.bgGradient = 'linear-gradient(135deg, #064e3b, #059669, #34d399)';
            break;
        case 'forgot_password':
            config.subject = '🔑 StudySync - Reset Password';
            config.title = 'Reset Password';
            config.message = 'We received a request to reset your password.';
            config.bgGradient = 'linear-gradient(135deg, #1e3a8a, #2563eb, #60a5fa)';
            break;
        case 'update_email':
            config.subject = '📧 Verify New Email';
            config.title = 'Verify Email';
            config.message = 'Please verify your new email address.';
            config.bgGradient = 'linear-gradient(135deg, #0c4a6e, #0284c7, #38bdf8)';
            break;
        case 'profile_update':
            config.subject = '🛡️ Confirm Profile Changes';
            config.title = 'Security Update';
            config.message = 'Confirm changes to your account settings.';
            config.bgGradient = 'linear-gradient(135deg, #78350f, #d97706, #fbbf24)';
            break;
        case 'register':
        default:
            config.subject = '🚀 Welcome! Verify your email';
            config.title = 'Welcome to StudySync';
            config.message = 'Welcome to the future of learning.';
            config.bgGradient = 'linear-gradient(135deg, #2e1065, #7c3aed, #a78bfa)';
            break;
    }

    const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: ${config.bgGradient}; padding: 50px 20px; text-align: center; min-height: 400px;">
      <div style="max-width: 500px; margin: 0 auto; background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid ${config.boxBorder}; border-radius: 24px; padding: 40px; box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);">
        <h2 style="color: #ffffff; margin-bottom: 20px; font-size: 28px; font-weight: 700;">${config.title}</h2>
        <p style="color: #e0e0e0; font-size: 16px; margin-bottom: 30px; line-height: 1.6;">${config.message}</p>
        <div style="background: rgba(0,0,0,0.2); border-radius: 12px; padding: 15px; display: inline-block; margin: 20px 0;">
            <div style="font-size: 42px; font-weight: 800; color: #ffffff; letter-spacing: 8px; font-family: monospace;">${otp}</div>
        </div>
        <p style="color: rgba(255,255,255,0.7); font-size: 13px; margin-top: 30px;">This code expires in 10 minutes.</p>
      </div>
      <div style="margin-top: 30px; color: rgba(255,255,255,0.5); font-size: 12px;">&copy; ${new Date().getFullYear()} StudySync. All rights reserved.</div>
    </div>
  `;

    return { subject: config.subject, html };
};

/**
 * Sends an OTP email using Brevo HTTP API
 */
export const sendEmail = async (email, otp, type = 'register') => {
    const SENDER_EMAIL = 'mail.akguptaji@gmail.com';
    const SENDER_NAME = "StudySync";

    const { subject, html } = getEmailTemplate(otp, type);

    console.log(`📨 Sending (${type}) to ${email} via Brevo HTTP API...`);

    let sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = html;
    sendSmtpEmail.sender = { "name": SENDER_NAME, "email": SENDER_EMAIL };
    sendSmtpEmail.to = [{ "email": email }];

    try {
        const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log('✅ Email sent successfully! Message ID: ' + data.messageId);
        return true;
    } catch (error) {
        console.error("❌ API Sending Error:", error);
        throw error;
    }
};
