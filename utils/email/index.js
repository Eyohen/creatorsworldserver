// utils/email/index.js - Main email service with retry and fallback

const config = require('./config');
const { EMAIL_TYPES, generateEmail } = require('./templates');
const {
  getPrimaryProvider,
  getFallbackProvider,
  getAllProviderStatus,
  hasAvailableProvider,
  getAvailableProviders
} = require('./providers');

/**
 * Service statistics
 */
const serviceStats = {
  totalSent: 0,
  totalFailed: 0,
  primarySuccesses: 0,
  fallbackSuccesses: 0,
  totalRetries: 0,
  lastSentTime: null,
  lastFailureTime: null,
  lastFallbackTime: null
};

/**
 * Sleep utility for retry delays
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Send email with retry and fallback logic
 * @param {Object} emailMessage - Email message to send
 * @param {string} emailMessage.to - Recipient email address
 * @param {string} emailMessage.subject - Email subject
 * @param {string} emailMessage.html - HTML content
 * @param {string} emailMessage.text - Plain text content
 * @param {string[]} [emailMessage.categories] - Email categories
 * @returns {Promise<{success: boolean, provider?: string, messageId?: string, error?: string}>}
 */
const sendWithRetryAndFallback = async (emailMessage) => {
  const primaryProvider = getPrimaryProvider();
  const fallbackProvider = getFallbackProvider();

  // Try primary provider with retries
  if (primaryProvider.isAvailable()) {
    for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
      console.log(`📧 [${primaryProvider.name}] Sending email to ${emailMessage.to} (attempt ${attempt}/${config.retryAttempts})`);

      const result = await primaryProvider.send(emailMessage);

      if (result.success) {
        serviceStats.totalSent++;
        serviceStats.primarySuccesses++;
        serviceStats.lastSentTime = new Date().toISOString();
        console.log(`✅ [${primaryProvider.name}] Email sent successfully to ${emailMessage.to}`);
        return {
          success: true,
          provider: primaryProvider.name,
          messageId: result.messageId
        };
      }

      // Log retry
      serviceStats.totalRetries++;
      console.warn(`⚠️  [${primaryProvider.name}] Attempt ${attempt} failed: ${result.error}`);

      // Wait before retry (exponential backoff)
      if (attempt < config.retryAttempts) {
        const delay = config.retryDelayMs * Math.pow(2, attempt - 1);
        console.log(`🔄 Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  } else {
    console.warn(`⚠️  Primary provider (${primaryProvider.name}) is not available`);
  }

  // Primary failed - try fallback
  if (fallbackProvider.isAvailable()) {
    console.log(`🔄 [Fallback] Attempting to send via ${fallbackProvider.name} to ${emailMessage.to}`);

    const result = await fallbackProvider.send(emailMessage);

    if (result.success) {
      serviceStats.totalSent++;
      serviceStats.fallbackSuccesses++;
      serviceStats.lastSentTime = new Date().toISOString();
      serviceStats.lastFallbackTime = new Date().toISOString();
      console.log(`✅ [${fallbackProvider.name} Fallback] Email sent successfully to ${emailMessage.to}`);
      return {
        success: true,
        provider: fallbackProvider.name,
        messageId: result.messageId,
        wasFallback: true
      };
    }

    console.error(`❌ [${fallbackProvider.name} Fallback] Failed: ${result.error}`);
  } else {
    console.error(`❌ Fallback provider (${fallbackProvider.name}) is not available`);
  }

  // Both providers failed
  serviceStats.totalFailed++;
  serviceStats.lastFailureTime = new Date().toISOString();
  console.error(`❌ All email providers failed for ${emailMessage.to}`);

  return {
    success: false,
    error: 'All email providers failed'
  };
};

/**
 * Send a verification email
 * @param {Object} user - User object with email, firstName
 * @param {string} verificationToken - Verification token
 * @param {string} [frontendUrl] - Frontend URL (optional, defaults to config)
 * @returns {Promise<boolean>}
 */
const sendVerificationEmail = async (user, verificationToken, frontendUrl = config.frontendUrl) => {
  const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

  const { subject, html, text } = generateEmail(EMAIL_TYPES.VERIFICATION, {
    firstName: user.firstName || user.businessName || 'User',
    verificationUrl
  });

  const result = await sendWithRetryAndFallback({
    to: user.email,
    subject,
    html,
    text,
    categories: config.categories.verification
  });

  return result.success;
};

/**
 * Send a welcome email
 * @param {Object} user - User object with email, firstName
 * @param {string} [frontendUrl] - Frontend URL (optional, defaults to config)
 * @returns {Promise<boolean>}
 */
const sendWelcomeEmail = async (user, frontendUrl = config.frontendUrl) => {
  const dashboardUrl = `${frontendUrl}/dashboard`;

  const { subject, html, text } = generateEmail(EMAIL_TYPES.WELCOME, {
    firstName: user.firstName || user.businessName || 'User',
    dashboardUrl
  });

  const result = await sendWithRetryAndFallback({
    to: user.email,
    subject,
    html,
    text,
    categories: config.categories.welcome
  });

  return result.success;
};

/**
 * Send a password reset email
 * @param {string} email - User's email address
 * @param {string} otp - One-time password
 * @param {string} resetToken - Reset token
 * @returns {Promise<boolean>}
 */
const sendResetPasswordEmail = async (email, otp, resetToken) => {
  const resetUrl = `${config.frontendUrl}/verify-otp?token=${resetToken}`;

  const { subject, html, text } = generateEmail(EMAIL_TYPES.PASSWORD_RESET, {
    email,
    otp,
    resetUrl
  });

  const result = await sendWithRetryAndFallback({
    to: email,
    subject,
    html,
    text,
    categories: config.categories.passwordReset
  });

  return result.success;
};

/**
 * Send a team invitation email
 * @param {Object} inviteData - Invitation data
 * @param {string} inviteData.email - Invitee's email
 * @param {string} inviteData.firstName - Invitee's first name
 * @param {string} inviteData.merchantName - Merchant name
 * @param {string} inviteData.role - Assigned role
 * @param {string} inviteData.inviteUrl - Invitation URL
 * @returns {Promise<boolean>}
 */
const sendTeamInviteEmail = async (inviteData) => {
  const { subject, html, text } = generateEmail(EMAIL_TYPES.TEAM_INVITE, inviteData);

  const result = await sendWithRetryAndFallback({
    to: inviteData.email,
    subject,
    html,
    text,
    categories: config.categories.teamInvite
  });

  return result.success;
};

/**
 * Send a payment success email
 * @param {Object} merchant - Merchant object with email and name
 * @param {Object} payment - Payment object with Network and Token
 * @param {string} transactionHash - Blockchain transaction hash
 * @returns {Promise<boolean>}
 */
const sendPaymentSuccessEmail = async (merchant, payment, transactionHash) => {
  const merchantAmount = payment.amount * (payment.merchantPercentage / 10000);
  const coinleyFee = payment.amount * (payment.coinleyPercentage / 10000);
  const currency = payment.Token?.symbol || payment.currency;
  const networkName = payment.Network?.name || 'Unknown';
  const explorerUrl = payment.Network?.explorerUrl
    ? `${payment.Network.explorerUrl}/tx/${transactionHash}`
    : '#';
  const dashboardUrl = `${config.frontendUrl}/transactions`;

  const { subject, html, text } = generateEmail(EMAIL_TYPES.PAYMENT_SUCCESS, {
    merchantName: merchant.businessName || merchant.name,
    amount: payment.amount,
    merchantAmount,
    coinleyFee,
    currency,
    networkName,
    transactionHash,
    explorerUrl,
    dashboardUrl,
    paymentId: payment.id
  });

  const result = await sendWithRetryAndFallback({
    to: merchant.email,
    subject,
    html,
    text,
    categories: config.categories.paymentSuccess
  });

  return result.success;
};

/**
 * Get service statistics and provider status
 * @returns {Object} Service statistics
 */
const getStats = () => {
  const providers = getAllProviderStatus();

  return {
    service: { ...serviceStats },
    providers,
    configuration: {
      primaryProvider: config.primaryProvider,
      retryAttempts: config.retryAttempts,
      retryDelayMs: config.retryDelayMs
    },
    health: {
      hasAvailableProvider: hasAvailableProvider(),
      availableProviders: getAvailableProviders()
    }
  };
};

/**
 * Get fallback statistics (for backward compatibility)
 * @returns {Object} Fallback statistics
 */
const getFallbackStats = () => {
  return {
    totalSendGridFailures: serviceStats.totalFailed,
    totalAzureFallbacks: serviceStats.fallbackSuccesses,
    lastFallbackTime: serviceStats.lastFallbackTime,
    azureAvailable: require('./providers/azure.provider').isAvailable(),
    sendGridConfigured: require('./providers/sendgrid.provider').isAvailable()
  };
};

/**
 * Reset all statistics
 */
const resetStats = () => {
  serviceStats.totalSent = 0;
  serviceStats.totalFailed = 0;
  serviceStats.primarySuccesses = 0;
  serviceStats.fallbackSuccesses = 0;
  serviceStats.totalRetries = 0;
  serviceStats.lastSentTime = null;
  serviceStats.lastFailureTime = null;
  serviceStats.lastFallbackTime = null;

  const sendgridProvider = require('./providers/sendgrid.provider');
  const azureProvider = require('./providers/azure.provider');
  sendgridProvider.resetStats();
  azureProvider.resetStats();
};

// Export email types for external use
module.exports = {
  // Email sending functions
  sendVerificationEmail,
  sendWelcomeEmail,
  sendResetPasswordEmail,
  sendTeamInviteEmail,
  sendPaymentSuccessEmail,

  // Low-level send function
  sendWithRetryAndFallback,

  // Statistics
  getStats,
  getFallbackStats,
  resetStats,

  // Email types enum
  EMAIL_TYPES,

  // Configuration
  config
};
