// utils/email/templates/index.js - Template registry

const verificationTemplate = require('./verification.template');
const welcomeTemplate = require('./welcome.template');
const passwordResetTemplate = require('./password-reset.template');
const teamInviteTemplate = require('./team-invite.template');
const paymentSuccessTemplate = require('./payment-success.template');

/**
 * Email template types
 */
const EMAIL_TYPES = {
  VERIFICATION: 'verification',
  WELCOME: 'welcome',
  PASSWORD_RESET: 'passwordReset',
  TEAM_INVITE: 'teamInvite',
  PAYMENT_SUCCESS: 'paymentSuccess'
};

/**
 * Template registry
 */
const templates = {
  [EMAIL_TYPES.VERIFICATION]: verificationTemplate,
  [EMAIL_TYPES.WELCOME]: welcomeTemplate,
  [EMAIL_TYPES.PASSWORD_RESET]: passwordResetTemplate,
  [EMAIL_TYPES.TEAM_INVITE]: teamInviteTemplate,
  [EMAIL_TYPES.PAYMENT_SUCCESS]: paymentSuccessTemplate
};

/**
 * Get a template by type
 * @param {string} type - Email type from EMAIL_TYPES
 * @returns {Object} Template module with generateHtml, generateText, subject/getSubject
 */
const getTemplate = (type) => {
  const template = templates[type];
  if (!template) {
    throw new Error(`Unknown email template type: ${type}`);
  }
  return template;
};

/**
 * Generate email content from a template
 * @param {string} type - Email type from EMAIL_TYPES
 * @param {Object} data - Data to pass to the template
 * @returns {Object} { subject, html, text }
 */
const generateEmail = (type, data) => {
  const template = getTemplate(type);

  // Handle templates with static subject vs dynamic subject
  const subject = typeof template.getSubject === 'function'
    ? template.getSubject(data)
    : template.subject;

  return {
    subject,
    html: template.generateHtml(data),
    text: template.generateText(data)
  };
};

module.exports = {
  EMAIL_TYPES,
  templates,
  getTemplate,
  generateEmail
};
