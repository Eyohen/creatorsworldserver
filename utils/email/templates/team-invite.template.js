// utils/email/templates/team-invite.template.js - Team invitation email template

const base = require('./base.template');

/**
 * Get role permissions list HTML
 * @param {string} role - User role (admin, manager, finance, viewer)
 * @returns {string} HTML list of permissions
 */
const getRolePermissionsList = (role) => {
  const permissions = {
    admin: [
      'Full access to dashboard and analytics',
      'Manage all transactions and payments',
      'Configure payment settings and wallets',
      'Invite and manage team members',
      'Access all reports and exports',
      'Modify account settings'
    ],
    manager: [
      'View dashboard and analytics',
      'Manage transactions and payments',
      'Export transaction reports',
      'Limited access to settings',
      'View team member list'
    ],
    finance: [
      'View financial dashboard',
      'Access all transaction data',
      'Export financial reports',
      'View payment analytics',
      'Read-only access to most features'
    ],
    viewer: [
      'View basic dashboard',
      'Read-only access to transactions',
      'View payment information',
      'Access personal profile settings',
      'No administrative privileges'
    ]
  };

  const rolePermissions = permissions[role] || ['Basic access permissions'];
  return rolePermissions.map(permission => `<li style="margin-bottom: 8px;">${permission}</li>`).join('');
};

/**
 * Generate HTML for team invitation email
 * @param {Object} data - Template data
 * @param {string} data.email - Invitee's email address
 * @param {string} data.firstName - Invitee's first name
 * @param {string} data.merchantName - Name of the merchant/organization
 * @param {string} data.role - Assigned role
 * @param {string} data.inviteUrl - Invitation acceptance URL
 * @returns {string} HTML content for the email
 */
const generateHtml = (data) => {
  const { email, firstName, merchantName, role, inviteUrl } = data;
  const roleCapitalized = role.charAt(0).toUpperCase() + role.slice(1);

  const content = `
<tr>
  <td style="padding: 30px;" class="content-padding">
    ${base.heading('Team Invitation!')}

    ${base.paragraph(`Hello ${firstName}!`)}

    ${base.paragraph(`Great News! You've been invited to join the <strong style="color: ${base.BRAND.primary};">${merchantName}</strong> team on Coinley as a <strong style="color: ${base.BRAND.primary};">${roleCapitalized}</strong>.`)}

    ${base.infoBox(`
      <h3 style="margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #1a1a1a;">Invitation Details</h3>
      <table style="width: 100%;" cellspacing="0" cellpadding="0">
        <tr>
          <td style="padding: 8px 0; font-size: 15px; color: #6b7280;">Organization</td>
          <td style="padding: 8px 0; font-size: 15px; font-weight: 600; color: #1a1a1a; text-align: right;">${merchantName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 15px; color: #6b7280;">Your Role</td>
          <td style="padding: 8px 0; font-size: 15px; font-weight: 600; color: #1a1a1a; text-align: right;">${roleCapitalized}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 15px; color: #6b7280;">Platform</td>
          <td style="padding: 8px 0; font-size: 15px; font-weight: 600; color: #1a1a1a; text-align: right;">Coinley Payment Gateway</td>
        </tr>
      </table>
    `)}

    <h3 style="margin: 20px 0 16px; font-size: 18px; font-weight: 600; color: #1a1a1a;">Your ${roleCapitalized} Role Includes:</h3>
    <ul style="margin: 0 0 20px; padding-left: 20px; font-size: 15px; line-height: 1.6; color: #4b5563;">
      ${getRolePermissionsList(role)}
    </ul>

    ${base.button(inviteUrl, 'Accept Invitation')}

    ${base.warningBox('Security Note:', 'This invitation link will expire in 7 days. If you didn\'t expect this invitation, you can safely ignore this email.')}

    <p style="margin: 0 0 10px; font-size: 14px; line-height: 1.5; color: #6b7280;">
      If the button doesn't work, you can copy and paste this link into your browser:
    </p>
    <p style="margin: 0 0 20px; word-break: break-all; color: ${base.BRAND.primary}; font-family: monospace; font-size: 12px; background-color: #f8f9fa; padding: 10px; border-radius: 4px;">
      ${inviteUrl}
    </p>

    ${base.paragraph(`If you have any questions about this invitation, please contact the team administrator at ${merchantName}.`)}
  </td>
</tr>`;

  return base.wrapHtml({
    title: 'Team Invitation - Coinley',
    content,
    preheader: `You've been invited to join ${merchantName} on Coinley as a ${roleCapitalized}`
  });
};

/**
 * Generate plain text version for team invitation email
 * @param {Object} data - Template data
 * @param {string} data.firstName - Invitee's first name
 * @param {string} data.merchantName - Name of the merchant/organization
 * @param {string} data.role - Assigned role
 * @param {string} data.inviteUrl - Invitation acceptance URL
 * @returns {string} Plain text content for the email
 */
const generateText = (data) => {
  const { firstName, merchantName, role, inviteUrl } = data;
  const roleCapitalized = role.charAt(0).toUpperCase() + role.slice(1);

  return `Hi ${firstName},

You've been invited to join ${merchantName} on Coinley as a ${roleCapitalized}.

To accept this invitation, visit:
${inviteUrl}

This invitation will expire in 7 days.

If you have any questions, please contact the team administrator at ${merchantName}.

Best regards,
The Coinley Team`;
};

/**
 * Generate email subject
 * @param {Object} data - Template data
 * @param {string} data.merchantName - Name of the merchant/organization
 * @returns {string} Email subject
 */
const getSubject = (data) => `You've been invited to join ${data.merchantName} on Coinley`;

module.exports = {
  generateHtml,
  generateText,
  getSubject
};
