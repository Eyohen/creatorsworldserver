// utils/azureEmailService.js - Azure email service facade (backward compatibility layer)
// This file is kept for backward compatibility and delegates to the new modular system

const azureProvider = require('./email/providers/azure.provider');

/**
 * Check if Azure email service is configured and available
 * @returns {boolean}
 */
const isAzureEmailAvailable = () => {
  return azureProvider.isAvailable();
};

/**
 * Send email via Azure Communication Services
 * @deprecated Use the main email service instead
 * @param {Object} emailMessage - Email message object
 * @returns {Promise<boolean>}
 */
const sendAzureEmail = async (emailMessage) => {
  const result = await azureProvider.send(emailMessage);
  return result.success;
};

/**
 * Send verification email via Azure
 * @deprecated Use emailService.sendVerificationEmail instead
 */
const sendVerificationEmailViaAzure = async (user, verificationToken, frontendUrl) => {
  console.warn('⚠️  sendVerificationEmailViaAzure is deprecated. Use emailService.sendVerificationEmail instead.');
  const { generateEmail, EMAIL_TYPES } = require('./email/templates');
  const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

  const { subject, html, text } = generateEmail(EMAIL_TYPES.VERIFICATION, {
    firstName: user.firstName || user.businessName || 'User',
    verificationUrl
  });

  return sendAzureEmail({ to: user.email, subject, html, text });
};

/**
 * Send welcome email via Azure
 * @deprecated Use emailService.sendWelcomeEmail instead
 */
const sendWelcomeEmailViaAzure = async (user, frontendUrl) => {
  console.warn('⚠️  sendWelcomeEmailViaAzure is deprecated. Use emailService.sendWelcomeEmail instead.');
  const { generateEmail, EMAIL_TYPES } = require('./email/templates');
  const dashboardUrl = `${frontendUrl}/dashboard`;

  const { subject, html, text } = generateEmail(EMAIL_TYPES.WELCOME, {
    firstName: user.firstName || user.businessName || 'User',
    dashboardUrl
  });

  return sendAzureEmail({ to: user.email, subject, html, text });
};

/**
 * Send password reset email via Azure
 * @deprecated Use emailService.sendResetPasswordEmail instead
 */
const sendResetPasswordEmailViaAzure = async (email, otp, resetToken) => {
  console.warn('⚠️  sendResetPasswordEmailViaAzure is deprecated. Use emailService.sendResetPasswordEmail instead.');
  const { generateEmail, EMAIL_TYPES } = require('./email/templates');
  const config = require('./email/config');
  const resetUrl = `${config.frontendUrl}/verify-otp?token=${resetToken}`;

  const { subject, html, text } = generateEmail(EMAIL_TYPES.PASSWORD_RESET, {
    email,
    otp,
    resetUrl
  });

  return sendAzureEmail({ to: email, subject, html, text });
};

/**
 * Send team invitation email via Azure
 * @deprecated Use emailService.sendTeamInviteEmail instead
 */
const sendTeamInviteEmailViaAzure = async (inviteData) => {
  console.warn('⚠️  sendTeamInviteEmailViaAzure is deprecated. Use emailService.sendTeamInviteEmail instead.');
  const { generateEmail, EMAIL_TYPES } = require('./email/templates');

  const { subject, html, text } = generateEmail(EMAIL_TYPES.TEAM_INVITE, inviteData);

  return sendAzureEmail({ to: inviteData.email, subject, html, text });
};

/**
 * Send payment success email via Azure
 * @deprecated Use emailService.sendPaymentSuccessEmail instead
 */
const sendPaymentSuccessEmailViaAzure = async (merchant, payment, transactionHash) => {
  console.warn('⚠️  sendPaymentSuccessEmailViaAzure is deprecated. Use emailService.sendPaymentSuccessEmail instead.');
  const { generateEmail, EMAIL_TYPES } = require('./email/templates');
  const config = require('./email/config');

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

  return sendAzureEmail({ to: merchant.email, subject, html, text });
};

module.exports = {
  isAzureEmailAvailable,
  sendVerificationEmailViaAzure,
  sendWelcomeEmailViaAzure,
  sendResetPasswordEmailViaAzure,
  sendTeamInviteEmailViaAzure,
  sendPaymentSuccessEmailViaAzure,
  sendAzureEmail
};
