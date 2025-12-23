// test/bigint-serialization.test.js - BigInt Serialization Tests

const {
  serializeBigInts,
  bigIntToString,
  bigIntToNumber,
  serializePaymentData,
  safeStringify,
  validateNoBigInts
} = require('../utils/bigint.serializer');

describe('BigInt Serialization Utilities', () => {

  // Test data mimicking real PaymentSplitter contract responses
  const mockPaymentData = {
    paymentId: 'coinley_test_123',
    customer: '0x15CC871833338AA230E398e0f571A1F273A72785',
    token: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
    totalAmount: 300000n, // BigInt
    merchantAmount: 291000n, // BigInt
    coinleyAmount: 9000n, // BigInt
    timestamp: 1726333845n, // BigInt
    merchantPercentage: 9700n, // BigInt (97%)
    coinleyPercentage: 300n, // BigInt (3%)
    blockTimestamp: new Date('2025-09-14T16:50:45.000Z')
  };

  const complexObjectWithBigInt = {
    id: 'test-123',
    amount: 1000n,
    nested: {
      value: 500n,
      array: [100n, 200n, 300n],
      mixed: {
        bigint: 999n,
        string: 'test',
        number: 42
      }
    },
    arrayOfObjects: [
      { id: 1, balance: 1000n },
      { id: 2, balance: 2000n }
    ]
  };

  test('should convert BigInt values to strings recursively', () => {
    console.log('🧪 Testing serializeBigInts with complex object...');

    const result = serializeBigInts(complexObjectWithBigInt);

    expect(result.amount).toBe('1000');
    expect(result.nested.value).toBe('500');
    expect(result.nested.array).toEqual(['100', '200', '300']);
    expect(result.nested.mixed.bigint).toBe('999');
    expect(result.nested.mixed.string).toBe('test');
    expect(result.nested.mixed.number).toBe(42);
    expect(result.arrayOfObjects[0].balance).toBe('1000');
    expect(result.arrayOfObjects[1].balance).toBe('2000');

    console.log('✅ serializeBigInts test passed');
  });

  test('should handle payment data serialization correctly', () => {
    console.log('🧪 Testing serializePaymentData with mock payment...');

    const result = serializePaymentData(mockPaymentData);

    expect(result.paymentId).toBe('coinley_test_123');
    expect(result.customer).toBe('0x15CC871833338AA230E398e0f571A1F273A72785');
    expect(result.totalAmount).toBe('300000');
    expect(result.merchantAmount).toBe('291000');
    expect(result.coinleyAmount).toBe('9000');
    expect(result.timestamp).toBe('1726333845');
    expect(result.merchantPercentage).toBe(9700);
    expect(result.coinleyPercentage).toBe(300);
    expect(result.blockTimestamp).toBeInstanceOf(Date);

    console.log('✅ serializePaymentData test passed');
  });

  test('should validate objects for BigInt presence', () => {
    console.log('🧪 Testing validateNoBigInts...');

    expect(validateNoBigInts(complexObjectWithBigInt)).toBe(false);

    const serialized = serializeBigInts(complexObjectWithBigInt);
    expect(validateNoBigInts(serialized)).toBe(true);

    console.log('✅ validateNoBigInts test passed');
  });

  test('should safely stringify objects with BigInt values', () => {
    console.log('🧪 Testing safeStringify...');

    // This would normally throw "Do not know how to serialize a BigInt"
    const jsonString = safeStringify(mockPaymentData);
    expect(typeof jsonString).toBe('string');

    const parsed = JSON.parse(jsonString);
    expect(parsed.totalAmount).toBe('300000');
    expect(parsed.merchantPercentage).toBe('9700');

    console.log('✅ safeStringify test passed');
  });

  test('should handle edge cases', () => {
    console.log('🧪 Testing edge cases...');

    // Null and undefined
    expect(serializeBigInts(null)).toBe(null);
    expect(serializeBigInts(undefined)).toBe(undefined);

    // Empty objects and arrays
    expect(serializeBigInts({})).toEqual({});
    expect(serializeBigInts([])).toEqual([]);

    // Mixed types
    expect(serializeBigInts({ a: 1n, b: 'test', c: null, d: undefined }))
      .toEqual({ a: '1', b: 'test', c: null, d: undefined });

    console.log('✅ Edge cases test passed');
  });

  test('should match real PaymentSplitter response structure', () => {
    console.log('🧪 Testing real PaymentSplitter response structure...');

    // Simulate the exact structure returned by the smart contract
    const contractResponse = {
      paymentId: 'coinley_merchant_order_123',
      customer: '0x1234567890123456789012345678901234567890',
      token: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      totalAmount: 500000n,
      recipient1: '0x9d961e093FFeC1577d124Cfe65233fE140E88Fc4',
      recipient1Amount: 485000n,
      recipient2: '0xEe9025Cc02c060C03ba5dba3d19C7ea2e752f44d',
      recipient2Amount: 15000n,
      recipient3: '0x0000000000000000000000000000000000000000',
      recipient3Amount: 0n,
      timestamp: 1726333845n,
      recipient1Percentage: 9700n,
      recipient2Percentage: 300n,
      recipient3Percentage: 0n
    };

    const serialized = serializePaymentData({
      paymentId: contractResponse.paymentId,
      customer: contractResponse.customer,
      token: contractResponse.token,
      totalAmount: contractResponse.totalAmount,
      merchantAddress: contractResponse.recipient1,
      merchantAmount: contractResponse.recipient1Amount,
      coinleyAddress: contractResponse.recipient2,
      coinleyAmount: contractResponse.recipient2Amount,
      timestamp: contractResponse.timestamp,
      merchantPercentage: contractResponse.recipient1Percentage,
      coinleyPercentage: contractResponse.recipient2Percentage
    });

    // Verify all values are properly converted
    expect(typeof serialized.totalAmount).toBe('string');
    expect(typeof serialized.merchantAmount).toBe('string');
    expect(typeof serialized.coinleyAmount).toBe('string');
    expect(typeof serialized.timestamp).toBe('string');
    expect(typeof serialized.merchantPercentage).toBe('number');
    expect(typeof serialized.coinleyPercentage).toBe('number');

    // Verify values are correct
    expect(serialized.totalAmount).toBe('500000');
    expect(serialized.merchantAmount).toBe('485000');
    expect(serialized.coinleyAmount).toBe('15000');
    expect(serialized.merchantPercentage).toBe(9700);
    expect(serialized.coinleyPercentage).toBe(300);

    // Verify it can be JSON stringified
    expect(() => JSON.stringify(serialized)).not.toThrow();

    console.log('✅ Real PaymentSplitter response test passed');
  });
});

// Integration test with PaymentProcessor flow
describe('Payment Processor Integration', () => {
  test('should handle complete payment verification flow without BigInt errors', () => {
    console.log('🧪 Testing complete payment verification flow...');

    // Mock the entire verification result structure
    const verificationResult = {
      success: true,
      message: 'Payment verified successfully',
      transaction: {
        id: 'payment-123',
        status: 'completed',
        amount: '100.50'
      },
      onChainData: {
        paymentId: 'coinley_test_123',
        customer: '0x15CC871833338AA230E398e0f571A1F273A72785',
        totalAmount: 500000n, // This would cause the error
        merchantPercentage: 9700n, // This would cause the error
        coinleyPercentage: 300n // This would cause the error
      }
    };

    // Serialize the result (simulating our fixed payment processor)
    const safeResult = serializeBigInts(verificationResult);

    // Verify no BigInt values remain
    expect(validateNoBigInts(safeResult)).toBe(true);

    // Verify it can be JSON stringified (what Express does)
    expect(() => JSON.stringify(safeResult)).not.toThrow();

    // Verify data integrity
    expect(safeResult.onChainData.totalAmount).toBe('500000');
    expect(safeResult.onChainData.merchantPercentage).toBe('9700');
    expect(safeResult.onChainData.coinleyPercentage).toBe('300');

    console.log('✅ Payment verification flow test passed');
  });
});

console.log('\n🎉 ALL BIGINT SERIALIZATION TESTS COMPLETED!\n');

module.exports = {
  mockPaymentData,
  complexObjectWithBigInt
};