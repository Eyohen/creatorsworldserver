// utils/email/config.js - Email service configuration

module.exports = {
  // Primary email provider - can be switched via environment variable
  primaryProvider: process.env.EMAIL_PRIMARY_PROVIDER || 'sendgrid',

  // Retry configuration
  retryAttempts: parseInt(process.env.EMAIL_RETRY_ATTEMPTS) || 2,
  retryDelayMs: parseInt(process.env.EMAIL_RETRY_DELAY_MS) || 1000,

  // Provider-specific configurations
  providers: {
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY,
      fromEmail: process.env.SENDGRID_FROM_EMAIL || 'info@coinley.io',
      fromName: 'Coinley',
      replyTo: 'support@coinley.io',
      replyToName: 'Coinley Support'
    },
    azure: {
      connectionString: process.env.AZURE_COMMUNICATION_CONNECTION_STRING,
      senderEmail: process.env.AZURE_COMMUNICATION_SENDER_EMAIL || 'DoNotReply@coinley.io',
      replyTo: process.env.AZURE_COMMUNICATION_REPLY_TO || 'support@coinley.io'
    }
  },

  // Frontend URL for building links in emails
  frontendUrl: process.env.FRONTEND_URL || 'https://merchant.coinley.io',

  // Email categories for analytics
  categories: {
    verification: ['verification', 'transactional'],
    welcome: ['welcome', 'transactional'],
    passwordReset: ['password-reset', 'transactional'],
    teamInvite: ['team-invite', 'transactional'],
    paymentSuccess: ['payment-notification', 'transactional']
  }
};
