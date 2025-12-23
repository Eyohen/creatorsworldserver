// utils/email/providers/index.js - Provider factory and registry

const sendgridProvider = require('./sendgrid.provider');
const azureProvider = require('./azure.provider');
const config = require('../config');

/**
 * Available providers
 */
const providers = {
  sendgrid: sendgridProvider,
  azure: azureProvider
};

/**
 * Get a provider by name
 * @param {string} name - Provider name ('sendgrid' or 'azure')
 * @returns {Object} Provider module
 */
const getProvider = (name) => {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Unknown email provider: ${name}`);
  }
  return provider;
};

/**
 * Get the primary provider based on configuration
 * @returns {Object} Primary provider module
 */
const getPrimaryProvider = () => {
  return getProvider(config.primaryProvider);
};

/**
 * Get the fallback provider (the other one)
 * @returns {Object} Fallback provider module
 */
const getFallbackProvider = () => {
  const fallbackName = config.primaryProvider === 'sendgrid' ? 'azure' : 'sendgrid';
  return getProvider(fallbackName);
};

/**
 * Get status of all providers
 * @returns {Object} Status of all providers
 */
const getAllProviderStatus = () => {
  return {
    primary: {
      name: config.primaryProvider,
      ...getPrimaryProvider().getStatus()
    },
    fallback: {
      name: config.primaryProvider === 'sendgrid' ? 'azure' : 'sendgrid',
      ...getFallbackProvider().getStatus()
    }
  };
};

/**
 * Check if any provider is available
 * @returns {boolean}
 */
const hasAvailableProvider = () => {
  return sendgridProvider.isAvailable() || azureProvider.isAvailable();
};

/**
 * Get list of available provider names
 * @returns {string[]}
 */
const getAvailableProviders = () => {
  const available = [];
  if (sendgridProvider.isAvailable()) available.push('sendgrid');
  if (azureProvider.isAvailable()) available.push('azure');
  return available;
};

module.exports = {
  providers,
  getProvider,
  getPrimaryProvider,
  getFallbackProvider,
  getAllProviderStatus,
  hasAvailableProvider,
  getAvailableProviders
};
