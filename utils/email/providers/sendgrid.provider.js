// utils/email/providers/sendgrid.provider.js - SendGrid email provider

const sgMail = require('@sendgrid/mail');
const config = require('../config');

/**
 * Provider name
 */
const name = 'sendgrid';

/**
 * Provider statistics
 */
const stats = {
  totalSent: 0,
  totalFailed: 0,
  lastSentTime: null,
  lastError: null
};

/**
 * Initialize the SendGrid client
 */
const initialize = () => {
  if (config.providers.sendgrid.apiKey) {
    sgMail.setApiKey(config.providers.sendgrid.apiKey);
    console.log('✅ SendGrid email provider initialized');
    return true;
  }
  console.warn('⚠️  SendGrid API key not configured');
  return false;
};

// Initialize on module load
initialize();

/**
 * Check if SendGrid is available and configured
 * @returns {boolean}
 */
const isAvailable = () => {
  return !!config.providers.sendgrid.apiKey;
};

/**
 * Get provider status
 * @returns {Object} Provider status information
 */
const getStatus = () => {
  return {
    name,
    available: isAvailable(),
    configured: !!config.providers.sendgrid.apiKey,
    stats: { ...stats }
  };
};

/**
 * Send an email via SendGrid
 * @param {Object} email - Email message object
 * @param {string} email.to - Recipient email address
 * @param {string} email.subject - Email subject
 * @param {string} email.html - HTML content
 * @param {string} email.text - Plain text content
 * @param {string[]} [email.categories] - SendGrid categories for analytics
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
const send = async (email) => {
  if (!isAvailable()) {
    return {
      success: false,
      error: 'SendGrid not configured'
    };
  }

  try {
    const msg = {
      to: email.to,
      from: {
        email: config.providers.sendgrid.fromEmail,
        name: config.providers.sendgrid.fromName
      },
      replyTo: {
        email: config.providers.sendgrid.replyTo,
        name: config.providers.sendgrid.replyToName
      },
      subject: email.subject,
      html: email.html,
      text: email.text,
      trackingSettings: {
        clickTracking: { enable: false },
        openTracking: { enable: false }
      },
      categories: email.categories || ['transactional']
    };

    const [response] = await sgMail.send(msg);

    // Update stats
    stats.totalSent++;
    stats.lastSentTime = new Date().toISOString();
    stats.lastError = null;

    return {
      success: true,
      messageId: response.headers['x-message-id']
    };
  } catch (error) {
    // Update stats
    stats.totalFailed++;
    stats.lastError = error.message;

    // Extract detailed error info
    let errorMessage = error.message;
    if (error.response && error.response.body) {
      const body = error.response.body;
      if (body.errors && body.errors.length > 0) {
        errorMessage = body.errors.map(e => e.message).join(', ');
      }
    }

    console.error(`❌ [SendGrid] Send failed: ${errorMessage}`);

    return {
      success: false,
      error: errorMessage,
      statusCode: error.code || error.response?.statusCode
    };
  }
};

/**
 * Reset provider statistics
 */
const resetStats = () => {
  stats.totalSent = 0;
  stats.totalFailed = 0;
  stats.lastSentTime = null;
  stats.lastError = null;
};

module.exports = {
  name,
  initialize,
  isAvailable,
  getStatus,
  send,
  resetStats
};
