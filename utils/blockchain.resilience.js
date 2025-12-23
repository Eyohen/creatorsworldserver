// utils/blockchain.resilience.js - Enhanced Blockchain Integration Resilience

const { ethers } = require('ethers');

/**
 * Enhanced blockchain integration with resilience patterns
 */
class BlockchainResilience {
  constructor() {
    this.providerCache = new Map();
    this.circuitBreakers = new Map();
    this.retryConfigs = new Map();
    this.providerHealthCheck = new Map();
  }

  /**
   * ✅ ENHANCED: Multi-provider setup with automatic failover
   */
  getResilientProvider(chainId) {
    const cacheKey = `provider_${chainId}`;

    if (this.providerCache.has(cacheKey)) {
      const cachedProvider = this.providerCache.get(cacheKey);
      if (this.isProviderHealthy(chainId)) {
        return cachedProvider;
      }
    }

    // Get provider configurations for the chain
    const providerConfigs = this.getProviderConfigs(chainId);
    const resilientProvider = this.createResilientProvider(chainId, providerConfigs);

    this.providerCache.set(cacheKey, resilientProvider);
    return resilientProvider;
  }

  /**
   * Get multiple provider configurations for failover
   */
  getProviderConfigs(chainId) {
    const configs = {
      1: [ // Ethereum Mainnet
        { type: 'infura', url: `https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`, priority: 1 },
        { type: 'alchemy', url: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`, priority: 2 },
        { type: 'public', url: 'https://eth.llamarpc.com', priority: 3 }
      ],
      56: [ // BSC
        { type: 'bsc', url: 'https://bsc-dataseed1.binance.org', priority: 1 },
        { type: 'bsc_backup', url: 'https://bsc-dataseed2.binance.org', priority: 2 }
      ],
      137: [ // Polygon
        { type: 'polygon', url: `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_POLYGON_KEY}`, priority: 1 },
        { type: 'polygon_public', url: 'https://polygon-rpc.com', priority: 2 }
      ],
      10: [ // Optimism
        { type: 'optimism', url: `https://opt-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_OPTIMISM_KEY}`, priority: 1 }
      ],
      42161: [ // Arbitrum
        { type: 'arbitrum', url: `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_ARBITRUM_KEY}`, priority: 1 }
      ]
    };

    return configs[chainId] || [];
  }

  /**
   * ✅ ENHANCED: Create provider with built-in resilience
   */
  createResilientProvider(chainId, configs) {
    if (!configs.length) {
      throw new Error(`No provider configurations found for chain ${chainId}`);
    }

    // Sort by priority
    const sortedConfigs = configs.sort((a, b) => a.priority - b.priority);

    // Create primary provider with fallbacks
    const providers = sortedConfigs.map(config => {
      try {
        return new ethers.providers.JsonRpcProvider(config.url);
      } catch (error) {
        console.warn(`Failed to create provider for ${config.type}:`, error.message);
        return null;
      }
    }).filter(Boolean);

    if (!providers.length) {
      throw new Error(`No valid providers available for chain ${chainId}`);
    }

    // Create resilient provider wrapper
    return this.wrapWithResilience(chainId, providers);
  }

  /**
   * Wrap provider with resilience features
   */
  wrapWithResilience(chainId, providers) {
    const self = this;
    let currentProviderIndex = 0;
    let currentProvider = providers[0];

    return new Proxy(currentProvider, {
      get(target, prop) {
        if (typeof target[prop] === 'function') {
          return async (...args) => {
            return await self.executeWithResilience(chainId, providers, currentProviderIndex, prop, args);
          };
        }
        return target[prop];
      }
    });
  }

  /**
   * ✅ ENHANCED: Execute blockchain calls with comprehensive error handling
   */
  async executeWithResilience(chainId, providers, startIndex, method, args) {
    const circuitBreaker = this.getCircuitBreaker(chainId);

    // Check circuit breaker
    if (circuitBreaker.isOpen()) {
      throw new Error(`Circuit breaker is open for chain ${chainId}. Service temporarily unavailable.`);
    }

    let lastError;
    let attempts = 0;
    const maxAttempts = providers.length;

    for (let i = 0; i < maxAttempts; i++) {
      const providerIndex = (startIndex + i) % providers.length;
      const provider = providers[providerIndex];
      attempts++;

      try {
        // Execute with timeout
        const timeoutMs = this.getTimeoutForMethod(method);
        const result = await Promise.race([
          provider[method](...args),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs)
          )
        ]);

        // Success - reset circuit breaker
        circuitBreaker.recordSuccess();
        this.recordProviderHealth(chainId, providerIndex, true);

        return result;

      } catch (error) {
        lastError = error;
        console.warn(`Provider ${providerIndex} failed for chain ${chainId}:`, error.message);

        // Record failure
        this.recordProviderHealth(chainId, providerIndex, false);

        // Check if this is a retryable error
        if (!this.isRetryableError(error)) {
          break;
        }

        // Wait before retrying (exponential backoff)
        if (i < maxAttempts - 1) {
          const backoffMs = Math.min(1000 * Math.pow(2, i), 5000);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      }
    }

    // All providers failed
    circuitBreaker.recordFailure();
    throw new Error(`All ${attempts} providers failed for chain ${chainId}. Last error: ${lastError?.message}`);
  }

  /**
   * Circuit breaker implementation
   */
  getCircuitBreaker(chainId) {
    if (!this.circuitBreakers.has(chainId)) {
      this.circuitBreakers.set(chainId, new CircuitBreaker(chainId));
    }
    return this.circuitBreakers.get(chainId);
  }

  /**
   * Check if error should trigger retry
   */
  isRetryableError(error) {
    const retryablePatterns = [
      /timeout/i,
      /network/i,
      /connection/i,
      /econnrefused/i,
      /etimedout/i,
      /rate limit/i,
      /too many requests/i,
      /service unavailable/i,
      /bad gateway/i,
      /gateway timeout/i
    ];

    const errorMessage = error.message.toLowerCase();
    return retryablePatterns.some(pattern => pattern.test(errorMessage));
  }

  /**
   * Get appropriate timeout for different methods
   */
  getTimeoutForMethod(method) {
    const timeouts = {
      'getBlockNumber': 5000,
      'getBlock': 10000,
      'getTransaction': 10000,
      'getTransactionReceipt': 10000,
      'call': 15000,
      'estimateGas': 10000,
      'sendTransaction': 30000
    };

    return timeouts[method] || 15000;
  }

  /**
   * Record provider health status
   */
  recordProviderHealth(chainId, providerIndex, isHealthy) {
    const key = `${chainId}_${providerIndex}`;
    const now = Date.now();

    if (!this.providerHealthCheck.has(key)) {
      this.providerHealthCheck.set(key, {
        successes: 0,
        failures: 0,
        lastCheck: now
      });
    }

    const health = this.providerHealthCheck.get(key);

    if (isHealthy) {
      health.successes++;
    } else {
      health.failures++;
    }

    health.lastCheck = now;
  }

  /**
   * Check if provider is healthy
   */
  isProviderHealthy(chainId, providerIndex = 0) {
    const key = `${chainId}_${providerIndex}`;
    const health = this.providerHealthCheck.get(key);

    if (!health) return true; // Assume healthy if no data

    // Consider unhealthy if failure rate > 50% in last 5 minutes
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    if (health.lastCheck < fiveMinutesAgo) return true; // Stale data, assume healthy

    const totalCalls = health.successes + health.failures;
    if (totalCalls === 0) return true;

    const failureRate = health.failures / totalCalls;
    return failureRate < 0.5;
  }

  /**
   * ✅ ENHANCED: Transaction verification with multiple confirmations
   */
  async verifyTransactionWithConfirmations(chainId, txHash, requiredConfirmations = 3) {
    const provider = this.getResilientProvider(chainId);

    try {
      // Get transaction receipt
      const receipt = await provider.getTransactionReceipt(txHash);
      if (!receipt) {
        throw new Error('Transaction not found');
      }

      // Get current block number
      const currentBlock = await provider.getBlockNumber();
      const confirmations = currentBlock - receipt.blockNumber;

      return {
        receipt,
        confirmations,
        isConfirmed: confirmations >= requiredConfirmations,
        blockNumber: receipt.blockNumber,
        currentBlock
      };

    } catch (error) {
      console.error(`Transaction verification failed for ${txHash}:`, error.message);
      throw error;
    }
  }

  /**
   * Clean up cached providers and health data
   */
  cleanup() {
    // Clear old health data (older than 1 hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    for (const [key, health] of this.providerHealthCheck) {
      if (health.lastCheck < oneHourAgo) {
        this.providerHealthCheck.delete(key);
      }
    }

    // Reset circuit breakers if they've been closed for too long
    for (const [chainId, circuitBreaker] of this.circuitBreakers) {
      circuitBreaker.cleanup();
    }
  }
}

/**
 * Simple circuit breaker implementation
 */
class CircuitBreaker {
  constructor(name, threshold = 5, timeout = 60000) {
    this.name = name;
    this.threshold = threshold;
    this.timeout = timeout;
    this.failureCount = 0;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.lastFailureTime = 0;
  }

  isOpen() {
    if (this.state === 'OPEN') {
      // Check if timeout has passed
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
        console.log(`Circuit breaker for ${this.name} is now HALF_OPEN`);
        return false;
      }
      return true;
    }
    return false;
  }

  recordSuccess() {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      console.log(`Circuit breaker for ${this.name} is now CLOSED`);
    }
  }

  recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      console.error(`Circuit breaker for ${this.name} is now OPEN (${this.failureCount} failures)`);
    }
  }

  cleanup() {
    // Reset if circuit has been closed for more than timeout period
    if (this.state === 'OPEN' && Date.now() - this.lastFailureTime > this.timeout * 2) {
      this.failureCount = 0;
      this.state = 'CLOSED';
    }
  }
}

// Singleton instance
const blockchainResilience = new BlockchainResilience();

// Cleanup interval (every 10 minutes)
setInterval(() => {
  blockchainResilience.cleanup();
}, 10 * 60 * 1000);

module.exports = blockchainResilience;