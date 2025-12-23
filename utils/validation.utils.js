// utils/validation.utils.js - Comprehensive Input Validation & Sanitization

const validator = require('validator');
const xss = require('xss');

/**
 * Comprehensive input sanitization and validation utilities
 */
class ValidationUtils {

  /**
   * Sanitize string input to prevent XSS
   */
  static sanitizeString(input) {
    if (typeof input !== 'string') return '';
    return xss(input.trim());
  }

  /**
   * Validate and sanitize payment amount
   */
  static validateAmount(amount) {
    if (!amount && amount !== 0) {
      throw new Error('Amount is required');
    }

    const numericAmount = parseFloat(amount);

    if (isNaN(numericAmount)) {
      throw new Error('Amount must be a valid number');
    }

    if (numericAmount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    if (numericAmount > 1000000) {
      throw new Error('Amount exceeds maximum allowed value');
    }

    // Check decimal places (max 6 decimal places)
    const decimalPlaces = (amount.toString().split('.')[1] || '').length;
    if (decimalPlaces > 6) {
      throw new Error('Amount cannot have more than 6 decimal places');
    }

    return numericAmount;
  }

  /**
   * Validate Ethereum address
   */
  static validateEthereumAddress(address) {
    if (!address) {
      throw new Error('Address is required');
    }

    if (typeof address !== 'string') {
      throw new Error('Address must be a string');
    }

    // Basic Ethereum address validation
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new Error('Invalid Ethereum address format');
    }

    // Prevent zero address
    if (address.toLowerCase() === '0x0000000000000000000000000000000000000000') {
      throw new Error('Zero address not allowed');
    }

    return address.toLowerCase();
  }

  /**
   * Validate Solana address (base58, 32-44 chars)
   */
  static validateSolanaAddress(address) {
    if (!address) {
      throw new Error('Address is required');
    }

    if (typeof address !== 'string') {
      throw new Error('Address must be a string');
    }

    // Solana addresses are base58 encoded, typically 32-44 characters
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
      throw new Error('Invalid Solana address format');
    }

    return address; // Solana addresses are case-sensitive
  }

  /**
   * Validate address based on network type
   */
  static validateAddress(address, network) {
    if (!address) {
      return null; // Address is optional in some cases
    }

    const isSolana = network === 'solana' || network === 'solana-devnet' || network === 'solana-mainnet';

    if (isSolana) {
      return this.validateSolanaAddress(address);
    } else {
      return this.validateEthereumAddress(address);
    }
  }

  /**
   * Validate transaction hash (EVM or Solana)
   */
  static validateTransactionHash(txHash, network = null) {
    if (!txHash) {
      throw new Error('Transaction hash is required');
    }

    if (typeof txHash !== 'string') {
      throw new Error('Transaction hash must be a string');
    }

    // Check formats
    const isEvmHash = /^0x[a-fA-F0-9]{64}$/.test(txHash);
    const isSolanaSignature = /^[1-9A-HJ-NP-Za-km-z]{87,88}$/.test(txHash);

    // Solana transaction signatures are base58, 87-88 characters
    if (isSolanaSignature) {
      return txHash; // Keep original case for Solana
    }

    // EVM transaction hash validation
    if (isEvmHash) {
      return txHash.toLowerCase();
    }

    throw new Error('Invalid transaction hash format');
  }

  /**
   * Validate chain ID
   */
  static validateChainId(chainId) {
    const numericChainId = parseInt(chainId);

    if (isNaN(numericChainId) || numericChainId <= 0) {
      throw new Error('Invalid chain ID');
    }

    // Supported chain IDs
    const supportedChains = [1, 56, 137, 10, 42161, 43114, 8453];
    if (!supportedChains.includes(numericChainId)) {
      throw new Error(`Unsupported chain ID: ${numericChainId}`);
    }

    return numericChainId;
  }

  /**
   * Validate UUID
   */
  static validateUUID(uuid) {
    if (!uuid) {
      throw new Error('UUID is required');
    }

    if (!validator.isUUID(uuid)) {
      throw new Error('Invalid UUID format');
    }

    return uuid;
  }

  /**
   * Validate email address
   */
  static validateEmail(email) {
    if (!email) return null; // Email is optional in some cases

    if (!validator.isEmail(email)) {
      throw new Error('Invalid email format');
    }

    return validator.normalizeEmail(email);
  }

  /**
   * Validate URL
   */
  static validateURL(url) {
    if (!url) return null; // URL is optional in some cases

    if (!validator.isURL(url, {
      protocols: ['http', 'https'],
      require_protocol: true
    })) {
      throw new Error('Invalid URL format');
    }

    return url;
  }

  /**
   * Validate currency symbol
   */
  static validateCurrency(currency) {
    if (!currency) {
      throw new Error('Currency is required');
    }

    const validCurrencies = ['USDT', 'USDC', 'DAI', 'BUSD'];
    if (!validCurrencies.includes(currency.toUpperCase())) {
      throw new Error(`Unsupported currency: ${currency}`);
    }

    return currency.toUpperCase();
  }

  /**
   * Validate network name
   */
  static validateNetwork(network) {
    if (!network) {
      throw new Error('Network is required');
    }

    const validNetworks = ['ethereum', 'bsc', 'polygon', 'optimism', 'arbitrum', 'avalanche', 'base', 'celo', 'solana'];
    if (!validNetworks.includes(network.toLowerCase())) {
      throw new Error(`Unsupported network: ${network}`);
    }

    return network.toLowerCase();
  }

  /**
   * Validate and sanitize metadata object
   */
  static validateMetadata(metadata) {
    if (!metadata) return {};

    if (typeof metadata !== 'object' || Array.isArray(metadata)) {
      throw new Error('Metadata must be an object');
    }

    // Sanitize string values in metadata
    const sanitizedMetadata = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (typeof value === 'string') {
        sanitizedMetadata[key] = this.sanitizeString(value);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitizedMetadata[key] = value;
      } else if (value === null || value === undefined) {
        sanitizedMetadata[key] = value;
      } else {
        // Skip complex objects/arrays to prevent injection
        console.warn(`Skipping metadata field '${key}' with unsupported type: ${typeof value}`);
      }
    }

    return sanitizedMetadata;
  }

  /**
   * Rate limiting validation
   */
  static validateRateLimit(req) {
    const userAgent = req.headers['user-agent'];
    const ip = req.ip || req.connection.remoteAddress;

    // Block suspicious user agents
    if (!userAgent || userAgent.length < 5) {
      throw new Error('Invalid user agent');
    }

    // Block common bot patterns
    const botPatterns = /bot|crawler|spider|scraper|curl|wget/i;
    if (botPatterns.test(userAgent)) {
      throw new Error('Automated requests not allowed');
    }

    return true;
  }

  /**
   * Validate payment creation request
   */
  static validatePaymentCreation(data) {
    const validated = {};

    validated.amount = this.validateAmount(data.amount);
    validated.currency = this.validateCurrency(data.currency || 'USDT');
    validated.network = this.validateNetwork(data.network || 'ethereum');
    validated.customerEmail = this.validateEmail(data.customerEmail);
    validated.callbackUrl = this.validateURL(data.callbackUrl);
    validated.metadata = this.validateMetadata(data.metadata || {});

    if (data.orderId) {
      validated.orderId = this.sanitizeString(data.orderId);
      if (validated.orderId.length > 100) {
        throw new Error('Order ID too long (max 100 characters)');
      }
    }

    return validated;
  }

  /**
   * Validate payment processing request
   */
  static validatePaymentProcessing(data) {
    const validated = {};

    validated.paymentId = this.validateUUID(data.paymentId);
    validated.network = this.validateNetwork(data.network);
    validated.transactionHash = this.validateTransactionHash(data.transactionHash, validated.network);

    if (data.senderAddress) {
      // Use network-aware address validation (Solana vs EVM)
      validated.senderAddress = this.validateAddress(data.senderAddress, validated.network);
    }

    return validated;
  }

  /**
   * Comprehensive request validation middleware
   */
  static createValidationMiddleware(validationType) {
    return (req, res, next) => {
      try {
        // Rate limit validation
        this.validateRateLimit(req);

        // Validate based on type
        switch (validationType) {
          case 'createPayment':
            req.validatedData = this.validatePaymentCreation(req.body);
            break;
          case 'processPayment':
            req.validatedData = this.validatePaymentProcessing(req.body);
            break;
          default:
            // Generic validation
            if (req.body) {
              req.validatedData = this.validateMetadata(req.body);
            }
        }

        next();
      } catch (error) {
        console.error('Validation error:', error.message);
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: error.message
        });
      }
    };
  }
}

module.exports = ValidationUtils;