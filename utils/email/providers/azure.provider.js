// utils/email/providers/azure.provider.js - Azure Communication Services email provider

const { EmailClient } = require('@azure/communication-email');
const config = require('../config');

/**
 * Provider name
 */
const name = 'azure';

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
 * Azure Email Client instance
 */
let emailClient = null;

/**
 * Initialize the Azure email client
 * @returns {boolean} Whether initialization was successful
 */
const initialize = () => {
  if (!config.providers.azure.connectionString) {
    console.warn('⚠️  Azure Communication Services connection string not configured');
    return false;
  }

  try {
    emailClient = new EmailClient(config.providers.azure.connectionString);
    console.log('✅ Azure Communication Services email provider initialized');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Azure email client:', error.message);
    return false;
  }
};

// Initialize on module load
initialize();

/**
 * Check if Azure email is available and configured
 * @returns {boolean}
 */
const isAvailable = () => {
  return emailClient !== null && !!config.providers.azure.connectionString;
};

/**
 * Get provider status
 * @returns {Object} Provider status information
 */
const getStatus = () => {
  return {
    name,
    available: isAvailable(),
    configured: !!config.providers.azure.connectionString,
    stats: { ...stats }
  };
};

/**
 * Send an email via Azure Communication Services
 * @param {Object} email - Email message object
 * @param {string} email.to - Recipient email address
 * @param {string} email.subject - Email subject
 * @param {string} email.html - HTML content
 * @param {string} email.text - Plain text content
 * @param {string} [email.category] - Email category for logging
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
const send = async (email) => {
  if (!isAvailable()) {
    return {
      success: false,
      error: 'Azure email not configured'
    };
  }

  try {
    // Azure email message structure
    const message = {
      senderAddress: config.providers.azure.senderEmail,
      content: {
        subject: email.subject,
        plainText: email.text,
        html: email.html
      },
      recipients: {
        to: [{ address: email.to }]
      },
      replyTo: [
        {
          address: config.providers.azure.replyTo
        }
      ],
      // Disable user engagement tracking for privacy
      userEngagementTrackingDisabled: true
    };

    // Start the send operation
    const poller = await emailClient.beginSend(message);

    // Wait for the operation to complete
    const result = await poller.pollUntilDone();

    // Update stats
    stats.totalSent++;
    stats.lastSentTime = new Date().toISOString();
    stats.lastError = null;

    console.log(`✅ [Azure] Email sent - MessageId: ${result.id}, Status: ${result.status}`);

    return {
      success: true,
      messageId: result.id,
      status: result.status
    };
  } catch (error) {
    // Update stats
    stats.totalFailed++;
    stats.lastError = error.message;

    // Extract detailed error info
    let errorMessage = error.message;
    if (error.statusCode) {
      errorMessage = `${errorMessage} (Status: ${error.statusCode})`;
    }
    if (error.code) {
      errorMessage = `${errorMessage} [${error.code}]`;
    }

    console.error(`❌ [Azure] Send failed: ${errorMessage}`);

    return {
      success: false,
      error: errorMessage,
      statusCode: error.statusCode,
      errorCode: error.code
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

/**
 * Reinitialize the client (useful after config changes)
 * @returns {boolean} Whether reinitialization was successful
 */
const reinitialize = () => {
  emailClient = null;
  return initialize();
};

module.exports = {
  name,
  initialize,
  reinitialize,
  isAvailable,
  getStatus,
  send,
  resetStats
};
