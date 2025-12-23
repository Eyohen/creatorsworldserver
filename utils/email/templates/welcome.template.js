// utils/email/templates/welcome.template.js - Welcome email template

const base = require('./base.template');

/**
 * Generate HTML for welcome email
 * @param {Object} data - Template data
 * @param {string} data.firstName - User's first name
 * @param {string} data.dashboardUrl - URL to the dashboard
 * @returns {string} HTML content for the email
 */
const generateHtml = (data) => {
  const { firstName, dashboardUrl } = data;

  const content = `
<tr>
  <td style="padding: 30px;" class="content-padding">
    ${base.heading('Welcome to Coinley!')}

    ${base.paragraph(`Hi ${firstName},`)}

    ${base.paragraph('Thank you for verifying your email address. Your account has been successfully activated!')}

    ${base.paragraph('You can now log in to your account and start using all the features that Coinley has to offer.')}

    ${base.button(dashboardUrl, 'Go to Dashboard')}

    <p style="margin: 0 0 10px; font-size: 16px; line-height: 1.5; color: ${base.BRAND.text};">
      Here's what you can do now:
    </p>

    <ul style="margin: 0 0 20px; padding-left: 20px; font-size: 16px; line-height: 1.5; color: ${base.BRAND.text};">
      <li style="margin-bottom: 10px;">Set up your wallet addresses</li>
      <li style="margin-bottom: 10px;">Configure payment settings</li>
      <li style="margin-bottom: 10px;">Start accepting cryptocurrency payments</li>
      <li>Explore analytics and reporting tools</li>
    </ul>

    ${base.paragraph('If you have any questions or need assistance, our support team is here to help.')}
  </td>
</tr>`;

  return base.wrapHtml({
    title: 'Welcome to Coinley',
    content,
    preheader: 'Your Coinley account is now active! Start accepting crypto payments today.'
  });
};

/**
 * Generate plain text version for welcome email
 * @param {Object} data - Template data
 * @param {string} data.firstName - User's first name
 * @param {string} data.dashboardUrl - URL to the dashboard
 * @returns {string} Plain text content for the email
 */
const generateText = (data) => {
  const { firstName, dashboardUrl } = data;

  return `Hi ${firstName},

Thank you for verifying your email. Your account has been successfully activated!

You can now log in to your account at ${dashboardUrl}

Here's what you can do now:
- Set up your wallet addresses
- Configure payment settings
- Start accepting cryptocurrency payments
- Explore analytics and reporting tools

If you have any questions, our support team is here to help.

Best regards,
The Coinley Team`;
};

/**
 * Email subject
 */
const subject = 'Welcome to Coinley!';

module.exports = {
  generateHtml,
  generateText,
  subject
};
