// utils/emailService.js - Email service facade (backward compatibility layer)
// This file delegates to the new modular email system while maintaining the same API

const emailService = require('./email');

// Log deprecation notice on first import
console.log('📧 Email service loaded (using new modular system with retry and fallback)');

/**
 * Send email verification link
 * @param {Object} user - User object containing email, first name, etc.
 * @param {string} verificationToken - The token for email verification
 * @param {string} frontendUrl - The frontend URL for building the verification link
 * @returns {Promise<boolean>} - Whether the email was successfully sent
 */
const sendVerificationEmail = async (user, verificationToken, frontendUrl) => {
  return emailService.sendVerificationEmail(user, verificationToken, frontendUrl);
};

/**
 * Send a welcome email after successful verification
 * @param {Object} user - User object containing email, first name, etc.
 * @param {string} frontendUrl - Base URL for the frontend
 * @returns {Promise<boolean>} - Whether the email was successfully sent
 */
const sendWelcomeEmail = async (user, frontendUrl) => {
  return emailService.sendWelcomeEmail(user, frontendUrl);
};

/**
 * Send a password reset email with OTP
 * @param {string} email - User's email address
 * @param {string} otp - One-time password for verification
 * @param {string} resetToken - Token for password reset
 * @returns {Promise<boolean>} - Whether the email was successfully sent
 */
const sendResetPasswordEmail = async (email, otp, resetToken) => {
  return emailService.sendResetPasswordEmail(email, otp, resetToken);
};

/**
 * Send team invitation email
 * @param {Object} inviteData - Object containing invitation details
 * @returns {Promise<boolean>} - Whether the email was successfully sent
 */
const sendTeamInviteEmail = async (inviteData) => {
  return emailService.sendTeamInviteEmail(inviteData);
};

/**
 * Send payment success notification email to merchant
 * @param {Object} merchant - Merchant object with email and name
 * @param {Object} payment - Payment object with Network and Token
 * @param {string} transactionHash - Blockchain transaction hash
 * @returns {Promise<boolean>} - Whether email was successfully sent
 */
const sendPaymentSuccessEmail = async (merchant, payment, transactionHash) => {
  return emailService.sendPaymentSuccessEmail(merchant, payment, transactionHash);
};

/**
 * Get fallback statistics (useful for monitoring/debugging)
 * @returns {Object} - Statistics about email provider usage
 */
const getFallbackStats = () => {
  return emailService.getFallbackStats();
};

/**
 * Get full email service statistics
 * @returns {Object} - Comprehensive statistics
 */
const getStats = () => {
  return emailService.getStats();
};

module.exports = {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendResetPasswordEmail,
  sendTeamInviteEmail,
  sendPaymentSuccessEmail,
  getFallbackStats,
  getStats
};
