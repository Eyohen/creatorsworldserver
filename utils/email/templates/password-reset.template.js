// utils/email/templates/password-reset.template.js - Password reset email template

const base = require('./base.template');

/**
 * Generate HTML for password reset email
 * @param {Object} data - Template data
 * @param {string} data.email - User's email address
 * @param {string} data.otp - One-time password for verification
 * @param {string} data.resetUrl - Password reset URL with token
 * @returns {string} HTML content for the email
 */
const generateHtml = (data) => {
  const { email, otp, resetUrl } = data;

  const content = `
<tr>
  <td style="padding: 30px;" class="content-padding">
    ${base.heading('Reset Your Password')}

    ${base.paragraph('Hello,')}

    ${base.paragraph(`We received a request to reset the password for your Coinley account associated with ${email}. To complete your password reset, please use the verification code below:`)}

    ${base.otpBox(otp)}

    ${base.paragraph('Alternatively, you can click the button below to verify your code:')}

    ${base.button(resetUrl, 'Verify Code')}

    ${base.paragraph('This verification code and link will expire in 10 minutes for security reasons.')}

    ${base.paragraph("If you didn't request a password reset, please ignore this email or contact our support team if you have concerns about your account's security.")}
  </td>
</tr>`;

  return base.wrapHtml({
    title: 'Reset Your Password',
    content,
    preheader: `Your password reset code is ${otp}. This code expires in 10 minutes.`
  });
};

/**
 * Generate plain text version for password reset email
 * @param {Object} data - Template data
 * @param {string} data.email - User's email address
 * @param {string} data.otp - One-time password for verification
 * @param {string} data.resetUrl - Password reset URL with token
 * @returns {string} Plain text content for the email
 */
const generateText = (data) => {
  const { email, otp, resetUrl } = data;

  return `Hello,

We received a request to reset your password for your Coinley account associated with ${email}.

Your verification code is: ${otp}

You can also reset your password by visiting: ${resetUrl}

This code and link will expire in 10 minutes.

If you didn't request a password reset, please ignore this email or contact support if you have concerns.

Best regards,
The Coinley Team`;
};

/**
 * Email subject
 */
const subject = 'Reset Your Password - Coinley';

module.exports = {
  generateHtml,
  generateText,
  subject
};
