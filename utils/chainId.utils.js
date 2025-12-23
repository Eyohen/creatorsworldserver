/**
 * ChainId Utility Functions
 * Ensures consistent decimal integer format across all API responses
 */

/**
 * Normalize chainId to decimal integer format
 * Handles both hex strings ("0x89") and decimal strings ("137") or numbers
 *
 * @param {string|number} chainId - ChainId in any format
 * @returns {number} - ChainId as decimal integer
 */
function normalizeChainId(chainId) {
  if (chainId === null || chainId === undefined) {
    throw new Error('chainId is required');
  }

  // If already a number, return it
  if (typeof chainId === 'number') {
    return Math.floor(chainId);
  }

  // Convert to string for processing
  const chainIdStr = String(chainId).trim();

  // Handle hex format (0x...)
  if (chainIdStr.startsWith('0x') || chainIdStr.startsWith('0X')) {
    return parseInt(chainIdStr, 16);
  }

  // Handle decimal string
  const decimalValue = parseInt(chainIdStr, 10);

  if (isNaN(decimalValue)) {
    throw new Error(`Invalid chainId format: ${chainId}`);
  }

  return decimalValue;
}

/**
 * Normalize Network object to ensure chainId is decimal integer
 * Modifies the network object in place and returns it
 *
 * @param {Object} network - Network object (Sequelize model or plain object)
 * @returns {Object} - Network object with normalized chainId
 */
function normalizeNetworkChainId(network) {
  if (!network) return network;

  // Handle Sequelize model instances
  const networkData = network.toJSON ? network.toJSON() : network;

  if (networkData.chainId) {
    networkData.chainId = normalizeChainId(networkData.chainId);
  }

  return networkData;
}

/**
 * Normalize array of Network objects
 *
 * @param {Array} networks - Array of network objects
 * @returns {Array} - Array of networks with normalized chainIds
 */
function normalizeNetworksChainId(networks) {
  if (!Array.isArray(networks)) return networks;

  return networks.map(network => normalizeNetworkChainId(network));
}

/**
 * Middleware to normalize Network chainId in responses
 * Recursively searches response data for Network objects and normalizes them
 *
 * @param {Object} data - Response data object
 * @returns {Object} - Data with normalized Network chainIds
 */
function normalizeResponseChainIds(data) {
  if (!data || typeof data !== 'object') return data;

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => normalizeResponseChainIds(item));
  }

  // Create a copy to avoid mutating original
  const normalized = { ...data };

  // Check if this is a Network object (has chainId field)
  if (normalized.chainId !== undefined) {
    normalized.chainId = normalizeChainId(normalized.chainId);
  }

  // Recursively normalize nested objects
  for (const key in normalized) {
    if (normalized[key] && typeof normalized[key] === 'object') {
      normalized[key] = normalizeResponseChainIds(normalized[key]);
    }
  }

  return normalized;
}

module.exports = {
  normalizeChainId,
  normalizeNetworkChainId,
  normalizeNetworksChainId,
  normalizeResponseChainIds
};
