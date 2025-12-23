// utils/bigint.serializer.js - Comprehensive BigInt Serialization Utilities

/**
 * Recursively converts BigInt values in an object to strings for JSON serialization
 * @param {any} obj - Object that may contain BigInt values
 * @param {Set} visited - Set to track visited objects (prevent circular references)
 * @returns {any} Object with BigInt values converted to strings
 */
function serializeBigInts(obj, visited = new Set()) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle BigInt directly
  if (typeof obj === 'bigint') {
    return obj.toString();
  }

  // Handle primitives
  if (typeof obj !== 'object') {
    return obj;
  }

  // ✅ FIXED: Prevent circular references
  if (visited.has(obj)) {
    return '[Circular Reference]';
  }
  visited.add(obj);

  try {
    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map(item => serializeBigInts(item, visited));
    }

    // Handle Date objects
    if (obj instanceof Date) {
      return obj;
    }

    // Handle other objects
    const serialized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip functions and symbols
      if (typeof value === 'function' || typeof value === 'symbol') {
        continue;
      }
      serialized[key] = serializeBigInts(value, visited);
    }
    return serialized;
  } finally {
    visited.delete(obj);
  }
}

/**
 * Safely converts various BigInt formats to strings
 * @param {bigint|string|number} value - Value to convert
 * @returns {string} String representation of the value
 */
function bigIntToString(value) {
  if (value === null || value === undefined) {
    return '0';
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    return value.toString();
  }

  // Try to convert unknown types
  try {
    return BigInt(value).toString();
  } catch (error) {
    console.warn('Failed to convert value to BigInt:', value, error.message);
    return '0';
  }
}

/**
 * Converts BigInt values to Numbers where appropriate (for percentages, etc.)
 * @param {bigint|string|number} value - Value to convert
 * @returns {number} Number representation
 */
function bigIntToNumber(value) {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'bigint') {
    return Number(value);
  }

  if (typeof value === 'string') {
    try {
      return Number(value);
    } catch (error) {
      console.warn('Failed to convert string to number:', value, error.message);
      return 0;
    }
  }

  return 0;
}

/**
 * Specific serializer for payment data from blockchain
 * @param {object} paymentData - Raw payment data from contract
 * @returns {object} Serialized payment data safe for JSON
 */
function serializePaymentData(paymentData) {
  if (!paymentData) {
    return null;
  }

  return {
    paymentId: paymentData.paymentId || '',
    customer: paymentData.customer || '',
    token: paymentData.token || '',
    totalAmount: bigIntToString(paymentData.totalAmount),
    merchantAddress: paymentData.merchantAddress || paymentData.recipient1 || '',
    merchantAmount: bigIntToString(paymentData.merchantAmount || paymentData.recipient1Amount),
    coinleyAddress: paymentData.coinleyAddress || paymentData.recipient2 || '',
    coinleyAmount: bigIntToString(paymentData.coinleyAmount || paymentData.recipient2Amount),
    timestamp: bigIntToString(paymentData.timestamp),
    blockTimestamp: paymentData.blockTimestamp || new Date(),
    merchantPercentage: bigIntToNumber(paymentData.merchantPercentage || paymentData.recipient1Percentage),
    coinleyPercentage: bigIntToNumber(paymentData.coinleyPercentage || paymentData.recipient2Percentage)
  };
}

/**
 * Custom JSON.stringify replacer function for BigInt values
 * @param {string} key - Object key
 * @param {any} value - Object value
 * @returns {any} Serializable value
 */
function bigIntReplacer(key, value) {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
}

/**
 * Safe JSON stringify with BigInt support
 * @param {any} obj - Object to stringify
 * @param {number} space - Indentation spaces (optional)
 * @returns {string} JSON string
 */
function safeStringify(obj, space = null) {
  try {
    return JSON.stringify(obj, bigIntReplacer, space);
  } catch (error) {
    console.error('JSON stringify failed:', error.message);
    // Fallback: serialize BigInts first, then stringify
    const serialized = serializeBigInts(obj);
    return JSON.stringify(serialized, null, space);
  }
}

/**
 * Validates that an object contains no BigInt values (for testing)
 * @param {any} obj - Object to validate
 * @param {Set} visited - Set to track visited objects (prevent circular references)
 * @returns {boolean} True if no BigInt values found
 */
function validateNoBigInts(obj, visited = new Set()) {
  if (obj === null || obj === undefined) {
    return true;
  }

  if (typeof obj === 'bigint') {
    return false;
  }

  if (typeof obj !== 'object') {
    return true;
  }

  // ✅ FIXED: Prevent circular references
  if (visited.has(obj)) {
    return true; // Assume circular references don't contain BigInt
  }
  visited.add(obj);

  try {
    if (Array.isArray(obj)) {
      return obj.every(item => validateNoBigInts(item, visited));
    }

    if (obj instanceof Date) {
      return true;
    }

    return Object.values(obj).every(value => {
      if (typeof value === 'function' || typeof value === 'symbol') {
        return true; // Skip functions and symbols
      }
      return validateNoBigInts(value, visited);
    });
  } finally {
    visited.delete(obj);
  }
}

module.exports = {
  serializeBigInts,
  bigIntToString,
  bigIntToNumber,
  serializePaymentData,
  bigIntReplacer,
  safeStringify,
  validateNoBigInts
};