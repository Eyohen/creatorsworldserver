// utils/email/templates/verification.template.js - Email verification template

const base = require('./base.template');

/**
 * Generate HTML for verification email
 * @param {Object} data - Template data
 * @param {string} data.firstName - User's first name
 * @param {string} data.verificationUrl - Full verification URL with token
 * @returns {string} HTML content for the email
 */
const generateHtml = (data) => {
  const { firstName, verificationUrl } = data;

  const content = `
<tr>
  <td style="padding: 30px;" class="content-padding">
    ${base.heading('Verify Your Email Address')}

    ${base.paragraph(`Hi ${firstName},`)}

    ${base.paragraph('Thanks for signing up for Coinley! Please verify your email address by clicking the button below:')}

    ${base.button(verificationUrl, 'Verify Email Address')}

    ${base.paragraph("If you didn't create an account with Coinley, you can safely ignore this email.")}

    ${base.paragraph('If the button above doesn\'t work, copy and paste this link into your browser:')}

    ${base.fallbackLink(verificationUrl)}
  </td>
</tr>`;

  return base.wrapHtml({
    title: 'Verify Your Email',
    content,
    preheader: 'Please verify your email address to activate your Coinley account'
  });
};

/**
 * Generate plain text version for verification email
 * @param {Object} data - Template data
 * @param {string} data.firstName - User's first name
 * @param {string} data.verificationUrl - Full verification URL with token
 * @returns {string} Plain text content for the email
 */
const generateText = (data) => {
  const { firstName, verificationUrl } = data;

  return `Hi ${firstName},

Thanks for signing up for Coinley! Please verify your email address by clicking this link:

${verificationUrl}

If you didn't create an account with Coinley, you can safely ignore this email.

Best regards,
The Coinley Team`;
};

/**
 * Email subject
 */
const subject = 'Verify Your Email Address - Coinley';

module.exports = {
  generateHtml,
  generateText,
  subject
};
