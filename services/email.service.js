const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  // For development, use ethereal or console
  if (process.env.NODE_ENV === 'development' && !process.env.SMTP_HOST) {
    return {
      sendMail: async (options) => {
        console.log('=== EMAIL (DEV MODE) ===');
        console.log('To:', options.to);
        console.log('Subject:', options.subject);
        console.log('Text:', options.text?.substring(0, 200));
        console.log('========================');
        return { messageId: 'dev-' + Date.now() };
      }
    };
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

const transporter = createTransporter();

const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const info = await transporter.sendMail({
      from: `"CreatorsWorld" <${process.env.SMTP_FROM || 'noreply@creatorsworld.ng'}>`,
      to,
      subject,
      text,
      html
    });
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email error:', error);
    throw error;
  }
};

// Email templates
const templates = {
  verification: (token) => ({
    subject: 'Verify Your CreatorsWorld Account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #28A745;">Welcome to CreatorsWorld!</h1>
        <p>Thank you for signing up. Please verify your email address by clicking the button below:</p>
        <a href="${process.env.CLIENT_URL}/verify-email?token=${token}"
           style="display: inline-block; background-color: #28A745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">
          Verify Email
        </a>
        <p>Or copy this link: ${process.env.CLIENT_URL}/verify-email?token=${token}</p>
        <p>This link expires in 24 hours.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #666; font-size: 12px;">
          If you didn't create an account, please ignore this email.
        </p>
      </div>
    `,
    text: `Welcome to CreatorsWorld! Verify your email: ${process.env.CLIENT_URL}/verify-email?token=${token}`
  }),

  passwordReset: (token) => ({
    subject: 'Reset Your CreatorsWorld Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #28A745;">Password Reset Request</h1>
        <p>You requested to reset your password. Click the button below to proceed:</p>
        <a href="${process.env.CLIENT_URL}/reset-password?token=${token}"
           style="display: inline-block; background-color: #28A745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">
          Reset Password
        </a>
        <p>Or copy this link: ${process.env.CLIENT_URL}/reset-password?token=${token}</p>
        <p>This link expires in 1 hour.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #666; font-size: 12px;">
          If you didn't request this, please ignore this email or contact support if concerned.
        </p>
      </div>
    `,
    text: `Reset your CreatorsWorld password: ${process.env.CLIENT_URL}/reset-password?token=${token}`
  }),

  passwordChanged: () => ({
    subject: 'Your CreatorsWorld Password Was Changed',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #28A745;">Password Changed</h1>
        <p>Your password was successfully changed.</p>
        <p>If you didn't make this change, please contact our support team immediately.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #666; font-size: 12px;">
          CreatorsWorld Security Team
        </p>
      </div>
    `,
    text: 'Your CreatorsWorld password was successfully changed.'
  }),

  newRequest: (data) => ({
    subject: `New Collaboration Request: ${data.campaignTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #28A745;">New Collaboration Request!</h1>
        <p><strong>${data.brandName}</strong> wants to collaborate with you.</p>
        <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3>${data.campaignTitle}</h3>
          <p>${data.campaignBrief?.substring(0, 200)}...</p>
          <p><strong>Budget:</strong> ₦${data.budget?.toLocaleString()}</p>
        </div>
        <a href="${process.env.CLIENT_URL}/creator/requests/${data.requestId}"
           style="display: inline-block; background-color: #28A745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">
          View Request
        </a>
      </div>
    `,
    text: `New collaboration request from ${data.brandName}: ${data.campaignTitle}`
  }),

  requestAccepted: (data) => ({
    subject: `Your Request Was Accepted: ${data.campaignTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #28A745;">Great News!</h1>
        <p><strong>${data.creatorName}</strong> accepted your collaboration request.</p>
        <a href="${process.env.CLIENT_URL}/brand/requests/${data.requestId}"
           style="display: inline-block; background-color: #28A745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">
          View Details
        </a>
      </div>
    `,
    text: `${data.creatorName} accepted your collaboration request: ${data.campaignTitle}`
  }),

  paymentReceived: (data) => ({
    subject: `Payment Received: ₦${data.amount?.toLocaleString()}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #28A745;">Payment Received!</h1>
        <p>You received a payment of <strong>₦${data.amount?.toLocaleString()}</strong> for:</p>
        <p>${data.campaignTitle}</p>
        <a href="${process.env.CLIENT_URL}/creator/earnings"
           style="display: inline-block; background-color: #28A745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">
          View Earnings
        </a>
      </div>
    `,
    text: `You received ₦${data.amount?.toLocaleString()} for ${data.campaignTitle}`
  })
};

module.exports = {
  sendEmail,

  sendVerificationEmail: async (email, token) => {
    const template = templates.verification(token);
    return sendEmail({ to: email, ...template });
  },

  sendPasswordResetEmail: async (email, token) => {
    const template = templates.passwordReset(token);
    return sendEmail({ to: email, ...template });
  },

  sendPasswordChangedEmail: async (email) => {
    const template = templates.passwordChanged();
    return sendEmail({ to: email, ...template });
  },

  sendNewRequestEmail: async (email, data) => {
    const template = templates.newRequest(data);
    return sendEmail({ to: email, ...template });
  },

  sendRequestAcceptedEmail: async (email, data) => {
    const template = templates.requestAccepted(data);
    return sendEmail({ to: email, ...template });
  },

  sendPaymentReceivedEmail: async (email, data) => {
    const template = templates.paymentReceived(data);
    return sendEmail({ to: email, ...template });
  }
};
