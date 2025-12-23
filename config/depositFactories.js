// config/depositFactories.js - PaymentFactorySplit (CREATE2 deposit) contract addresses
// These contracts enable gasless deposit addresses with automatic fee splitting

// Deployed factory addresses per chain
// Factory address is deterministic across chains using CREATE2 deployment
const DEPOSIT_FACTORY_ADDRESSES = {
  // Base Mainnet - Deployed
  '8453': process.env.BASE_SPLIT_FACTORY_ADDRESS || '0x373A8997fFe0D1aBf42F022FaEf1F0F3551C3553',

  // BSC Mainnet - Deployed
  '56': process.env.BSC_SPLIT_FACTORY_ADDRESS || '0x373A8997fFe0D1aBf42F022FaEf1F0F3551C3553',

  // Arbitrum Mainnet - Deployed
  '42161': process.env.ARBITRUM_SPLIT_FACTORY_ADDRESS || '0x373A8997fFe0D1aBf42F022FaEf1F0F3551C3553',

  // Future chains (deploy when needed)
  // '1': process.env.ETHEREUM_SPLIT_FACTORY_ADDRESS || null,
  // '137': process.env.POLYGON_SPLIT_FACTORY_ADDRESS || null,
  // '10': process.env.OPTIMISM_SPLIT_FACTORY_ADDRESS || null,
  // '43114': process.env.AVALANCHE_SPLIT_FACTORY_ADDRESS || null,
};

// Implementation addresses (PaymentForwarderSplit)
const DEPOSIT_IMPLEMENTATION_ADDRESSES = {
  '8453': process.env.BASE_SPLIT_IMPLEMENTATION_ADDRESS || '0x9439Fce7bAD99eCaF0Dc1BE87D4E256250Cf4e39',
  '56': process.env.BSC_SPLIT_IMPLEMENTATION_ADDRESS || '0x9439Fce7bAD99eCaF0Dc1BE87D4E256250Cf4e39',
  '42161': process.env.ARBITRUM_SPLIT_IMPLEMENTATION_ADDRESS || '0x9439Fce7bAD99eCaF0Dc1BE87D4E256250Cf4e39',
};

// Chain-specific confirmation requirements
const CHAIN_CONFIRMATIONS = {
  '1': 12,      // Ethereum - slower but safer
  '56': 20,     // BSC
  '137': 128,   // Polygon - needs more confirmations
  '10': 20,     // Optimism
  '42161': 20,  // Arbitrum
  '43114': 20,  // Avalanche
  '8453': 20,   // Base
  '42220': 20,  // Celo
};

// PaymentFactorySplit contract ABI - minimal interface for deposit address operations
const DEPOSIT_FACTORY_ABI = [
  // View functions
  {
    inputs: [{ name: 'salt', type: 'bytes32' }],
    name: 'getDepositAddress',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'paymentId', type: 'string' }],
    name: 'getSalt',
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'pure',
    type: 'function'
  },
  {
    inputs: [],
    name: 'implementation',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'platformWallet',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'defaultFeeBps',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  // Sweep functions
  {
    inputs: [
      { name: 'salt', type: 'bytes32' },
      { name: 'token', type: 'address' },
      { name: 'merchant', type: 'address' }
    ],
    name: 'sweep',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'salt', type: 'bytes32' },
      { name: 'token', type: 'address' },
      { name: 'merchant', type: 'address' },
      { name: 'feeBps', type: 'uint256' }
    ],
    name: 'sweepWithFee',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'salts', type: 'bytes32[]' },
      { name: 'tokens', type: 'address[]' },
      { name: 'merchants', type: 'address[]' }
    ],
    name: 'batchSweep',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'salts', type: 'bytes32[]' },
      { name: 'tokens', type: 'address[]' },
      { name: 'merchants', type: 'address[]' },
      { name: 'feeBps', type: 'uint256[]' }
    ],
    name: 'batchSweepWithFees',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'salt', type: 'bytes32' },
      { indexed: true, name: 'depositAddress', type: 'address' },
      { indexed: false, name: 'token', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
      { indexed: false, name: 'merchant', type: 'address' },
      { indexed: false, name: 'platformFee', type: 'uint256' }
    ],
    name: 'Swept',
    type: 'event'
  }
];

// ERC20 ABI for balance checking
const ERC20_BALANCE_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// Get deposit factory address for a chain
function getDepositFactoryAddress(chainId) {
  const address = DEPOSIT_FACTORY_ADDRESSES[chainId.toString()];
  if (!address) {
    throw new Error(`Deposit factory not deployed on chain ${chainId}`);
  }
  return address;
}

// Get implementation address for a chain
function getImplementationAddress(chainId) {
  const address = DEPOSIT_IMPLEMENTATION_ADDRESSES[chainId.toString()];
  if (!address) {
    throw new Error(`Deposit implementation not deployed on chain ${chainId}`);
  }
  return address;
}

// Check if deposit factory is supported on chain
function isDepositFactorySupported(chainId) {
  return !!DEPOSIT_FACTORY_ADDRESSES[chainId.toString()];
}

// Get required confirmations for a chain
function getRequiredConfirmations(chainId) {
  return CHAIN_CONFIRMATIONS[chainId.toString()] || 20; // Default to 20 if not specified
}

// Get all chain IDs with deposit factory support
function getSupportedDepositChains() {
  return Object.keys(DEPOSIT_FACTORY_ADDRESSES).filter(chainId =>
    DEPOSIT_FACTORY_ADDRESSES[chainId]
  );
}

module.exports = {
  DEPOSIT_FACTORY_ADDRESSES,
  DEPOSIT_IMPLEMENTATION_ADDRESSES,
  DEPOSIT_FACTORY_ABI,
  ERC20_BALANCE_ABI,
  CHAIN_CONFIRMATIONS,
  getDepositFactoryAddress,
  getImplementationAddress,
  isDepositFactorySupported,
  getRequiredConfirmations,
  getSupportedDepositChains
};
