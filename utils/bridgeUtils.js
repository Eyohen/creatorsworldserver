// utils/bridgeUtils.js
const axios = require('axios');
const ethers = require('ethers');

/**
 * Utility functions for interacting with Across.to bridge
 */
const bridgeUtils = {
  integratorId: process.env.ACROSS_INTEGRATOR_ID,
  
  /**
   * Get headers with integrator ID for API requests
   */
  getHeaders() {
    const headers = {};
    if (this.integratorId) {
      headers['x-integrator-id'] = this.integratorId;
    }
    return headers;
  },

  /**
   * Check if a token/network combination is supported by Across bridge
   * @param {string} token - Token symbol (e.g., 'USDT')
   * @param {string} sourceNetwork - Source network name
   * @param {string} destinationNetwork - Destination network name
   * @returns {Promise<boolean>} - Whether the bridge is supported
   */
  async isBridgeSupported(token, sourceNetwork, destinationNetwork) {
    try {
      // Call Across API to check supported routes
      const response = await axios.get('https://across.to/api/available-routes', {
        headers: this.getHeaders()
      });
      
      // Convert network names to chain IDs for comparison
      const networkToChainId = {
        'ethereum': 1,
        'optimism': 10,
        'arbitrum': 42161,
        'polygon': 137,
        'base': 8453,
        'linea': 59144
      };
      
      const sourceChainId = networkToChainId[sourceNetwork.toLowerCase()];
      const destChainId = networkToChainId[destinationNetwork.toLowerCase()];
      
      if (!sourceChainId || !destChainId) {
        return false;
      }
      
      // Check if the route exists in the available routes
      const isSupported = response.data.some(route => 
        route.originChainId === sourceChainId &&
        route.destinationChainId === destChainId &&
        route.inputToken.symbol.toUpperCase() === token.toUpperCase()
      );
      
      return isSupported;
    } catch (error) {
      console.error('Error checking bridge support:', error);
      return false; // Default to not supported on error
    }
  },

  /**
   * Get fee estimate for a bridge transaction
   * @param {Object} params - Bridge parameters
   * @returns {Promise<Object>} - Fee details
   */
  async getBridgeFee(params) {
    const { token, amount, sourceNetwork, destinationNetwork } = params;
    
    try {
      // Convert network names to chain IDs
      const networkToChainId = {
        'ethereum': 1,
        'optimism': 10,
        'arbitrum': 42161,
        'polygon': 137,
        'base': 8453,
        'linea': 59144
      };
      
      const sourceChainId = networkToChainId[sourceNetwork.toLowerCase()];
      const destChainId = networkToChainId[destinationNetwork.toLowerCase()];
      
      if (!sourceChainId || !destChainId) {
        throw new Error('Unsupported network');
      }
      
      // Determine token decimals (you might want to fetch this from your token registry)
      const tokenDecimals = ['USDT', 'USDC'].includes(token.toUpperCase()) ? 6 : 18;
      const amountInWei = ethers.utils.parseUnits(amount.toString(), tokenDecimals);
      
      // Call Across API for fee quote
      const response = await axios.get('https://across.to/api/suggested-fees', {
        headers: this.getHeaders(),
        params: {
          originChainId: sourceChainId,
          destinationChainId: destChainId,
          token: token.toUpperCase(),
          amount: amountInWei.toString(),
          recipient: '0x0000000000000000000000000000000000000000' // Placeholder
        }
      });
      
      return {
        success: true,
        relayerFee: response.data.relayerFee?.total || '0',
        capitalFee: response.data.capitalFee?.total || '0',
        totalFee: response.data.totalRelayFee?.total || '0',
        estimatedTimeMinutes: Math.ceil((response.data.estimatedFillTimeSec || 300) / 60),
        isAmountTooLow: response.data.isAmountTooLow || false
      };
    } catch (error) {
      console.error('Error getting bridge fee:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Generate widget URL for Across.to bridge
   * @param {Object} params - Bridge parameters
   * @returns {string} - URL for the widget
   */
  generateWidgetUrl(params) {
    const { token, amount, sourceNetwork, destinationNetwork, recipient } = params;
    
    // Convert network names to chain IDs
    const networkToChainId = {
      'ethereum': 1,
      'optimism': 10,
      'arbitrum': 42161,
      'polygon': 137,
      'base': 8453,
      'linea': 59144
    };
    
    const sourceChainId = networkToChainId[sourceNetwork.toLowerCase()];
    const destChainId = networkToChainId[destinationNetwork.toLowerCase()];
    
    if (!sourceChainId || !destChainId) {
      throw new Error('Unsupported network');
    }
    
    // Construct widget URL
    const widgetUrl = new URL('https://across.to/bridge');
    widgetUrl.searchParams.append('from', sourceChainId);
    widgetUrl.searchParams.append('to', destChainId);
    widgetUrl.searchParams.append('asset', token.toUpperCase());
    widgetUrl.searchParams.append('amount', amount);
    
    if (recipient) {
      widgetUrl.searchParams.append('recipient', recipient);
    }
    
    // Add integrator ID as referrer if available
    if (this.integratorId) {
      widgetUrl.searchParams.append('referrer', this.integratorId);
    }
    
    return widgetUrl.toString();
  },

  /**
   * Check status of a bridge transaction
   * @param {string} bridgeTransactionHash - Hash of the bridge transaction
   * @param {number} originChainId - Origin chain ID where transaction was initiated
   * @returns {Promise<Object>} - Bridge status
   */
  async checkBridgeStatus(bridgeTransactionHash, originChainId) {
    try {
      const response = await axios.get('https://across.to/api/deposits/status', {
        headers: this.getHeaders(),
        params: {
          txHash: bridgeTransactionHash,
          originChainId: originChainId
        }
      });
      
      return {
        success: true,
        status: response.data.status, // 'pending', 'filled', 'expired', etc.
        fillTxHash: response.data.fillTxHash, // Destination chain transaction hash
        sourceChainId: response.data.sourceChainId,
        destinationChainId: response.data.destinationChainId,
        amount: response.data.amount,
        recipient: response.data.recipient,
        updatedAt: response.data.updatedAt
      };
    } catch (error) {
      console.error('Error checking bridge status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};

module.exports = bridgeUtils;