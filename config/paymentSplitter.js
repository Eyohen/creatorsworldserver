// config/paymentSplitter.js - PaymentSplitter contract/program addresses for all supported networks
const PAYMENT_SPLITTER_ADDRESSES = {
  // Ethereum Mainnet
  '1': '0x410a087bcddde70b0614127842d5ba40ec91b488',
  
  // BSC (Binance Smart Chain)
  '56': '0x62c66777508188210741D20D886c7A08416f8518',
  
  // Polygon
  '137': '0x54b07B3c70B9388653Cc5C00b114e8238cd9E21F',
  
  // Optimism (deployed ✅)
  '10': '0x48E967d182F744EdB18AcA7092814f1FE17fcB2d',
  
  // Arbitrum
  '42161': '0x54ea71Cd36992D7FD443584FE5535BB893abd62C',
  
  // Avalanche
  '43114': '0xfb16e982a9ffca66dba0834989933f4720e15dc5',
  
  // Base
  '8453': '0x6D827e60d0dC279cAa09f026d1641ECDb5704753', // Base PaymentSplitter deployed

  // Celo
  '42220': '0x54b07B3c70B9388653Cc5C00b114e8238cd9E21F',

  // Solana Devnet (program ID, not EVM contract address)
  '103': 'Crz57kC6npUiFHx7xg1sE2oMDXLFHeqKhDgXJXcuDT3B',
};

// PaymentSplitter contract ABI
const PAYMENT_SPLITTER_ABI = [
  {
    "inputs": [
      { "name": "_defaultRecipient1", "type": "address" },
      { "name": "_defaultRecipient2", "type": "address" },
      { "name": "_defaultRecipient3", "type": "address" }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "defaultRecipient1",
    "outputs": [{ "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "defaultRecipient2", 
    "outputs": [{ "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "defaultRecipient3",
    "outputs": [{ "name": "", "type": "address" }], 
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          { "name": "token", "type": "address" },
          { "name": "amount", "type": "uint256" },
          { "name": "paymentId", "type": "string" },
          { "name": "recipient1", "type": "address" },
          { "name": "recipient2", "type": "address" },
          { "name": "recipient3", "type": "address" },
          { "name": "recipient1Percentage", "type": "uint256" },
          { "name": "recipient2Percentage", "type": "uint256" },
          { "name": "recipient3Percentage", "type": "uint256" }
        ],
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "splitPayment",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "token", "type": "address" },
      { "name": "amount", "type": "uint256" },
      { "name": "paymentId", "type": "string" },
      { "name": "recipient1Percentage", "type": "uint256" },
      { "name": "recipient2Percentage", "type": "uint256" }
    ],
    "name": "splitPaymentDefault",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "name": "paymentId", "type": "string" }],
    "name": "getPayment",
    "outputs": [
      {
        "components": [
          { "name": "customer", "type": "address" },
          { "name": "token", "type": "address" },
          { "name": "recipient1", "type": "address" },
          { "name": "recipient2", "type": "address" },
          { "name": "recipient3", "type": "address" },
          { "name": "totalAmount", "type": "uint256" },
          { "name": "recipient1Amount", "type": "uint256" },
          { "name": "recipient2Amount", "type": "uint256" },
          { "name": "recipient3Amount", "type": "uint256" },
          { "name": "recipient1Percentage", "type": "uint256" },
          { "name": "recipient2Percentage", "type": "uint256" },
          { "name": "recipient3Percentage", "type": "uint256" },
          { "name": "timestamp", "type": "uint256" },
          { "name": "paymentId", "type": "string" }
        ],
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "recipient", "type": "address" },
      { "name": "token", "type": "address" }
    ],
    "name": "getRecipientEarnings",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "paymentId", "type": "string" },
      { "indexed": true, "name": "customer", "type": "address" },
      { "indexed": true, "name": "token", "type": "address" },
      { "name": "totalAmount", "type": "uint256" }
    ],
    "name": "PaymentSplit",
    "type": "event"
  }
];

// Dual Alchemy API keys for failover
const ALCHEMY_KEY_PRIMARY = 'YWG990wOlIikc1tU7-WWTepfU8d1f4dp';
const ALCHEMY_KEY_SECONDARY = 'qtIcCe_-8t4rIWktnWJm0';

// Network configurations with RPC URLs - Using Alchemy with fallback
const NETWORK_CONFIGS = {
  '1': {
    name: 'Ethereum',
    rpcUrl: process.env.ETHEREUM_RPC_URL || `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY_PRIMARY}`,
    rpcUrlFallback: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY_SECONDARY}`,
    wssUrl: process.env.ETHEREUM_WSS_URL || `wss://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY_PRIMARY}`,
    blockExplorer: 'https://etherscan.io'
  },
  '56': {
    name: 'BSC',
    rpcUrl: process.env.BSC_RPC_URL || `https://bnb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY_PRIMARY}`,
    rpcUrlFallback: `https://bnb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY_SECONDARY}`,
    wssUrl: process.env.BSC_WSS_URL || 'wss://bsc-ws-node.nariox.org:443',
    blockExplorer: 'https://bscscan.com'
  },
  '137': {
    name: 'Polygon',
    rpcUrl: process.env.POLYGON_RPC_URL || `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY_PRIMARY}`,
    rpcUrlFallback: `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY_SECONDARY}`,
    wssUrl: process.env.POLYGON_WSS_URL || `wss://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY_PRIMARY}`,
    blockExplorer: 'https://polygonscan.com'
  },
  '10': {
    name: 'Optimism',
    rpcUrl: process.env.OPTIMISM_RPC_URL || `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY_PRIMARY}`,
    rpcUrlFallback: `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY_SECONDARY}`,
    wssUrl: process.env.OPTIMISM_WSS_URL || `wss://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY_PRIMARY}`,
    blockExplorer: 'https://optimistic.etherscan.io'
  },
  '42161': {
    name: 'Arbitrum',
    rpcUrl: process.env.ARBITRUM_RPC_URL || `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY_PRIMARY}`,
    rpcUrlFallback: `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY_SECONDARY}`,
    wssUrl: process.env.ARBITRUM_WSS_URL || `wss://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY_PRIMARY}`,
    blockExplorer: 'https://arbiscan.io'
  },
  '43114': {
    name: 'Avalanche',
    rpcUrl: process.env.AVALANCHE_RPC_URL || `https://avax-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY_PRIMARY}`,
    rpcUrlFallback: `https://avax-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY_SECONDARY}`,
    wssUrl: process.env.AVALANCHE_WSS_URL || `wss://avax-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY_PRIMARY}`,
    blockExplorer: 'https://snowtrace.io'
  },
  '8453': {
    name: 'Base',
    rpcUrl: process.env.BASE_RPC_URL || `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY_PRIMARY}`,
    rpcUrlFallback: `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY_SECONDARY}`,
    wssUrl: process.env.BASE_WSS_URL || `wss://base-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY_PRIMARY}`,
    blockExplorer: 'https://basescan.org'
  },
  '42220': {
    name: 'Celo',
    rpcUrl: process.env.CELO_RPC_URL || `https://celo-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY_PRIMARY}`,
    rpcUrlFallback: `https://celo-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY_SECONDARY}`,
    wssUrl: process.env.CELO_WSS_URL || `wss://celo-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY_PRIMARY}`,
    blockExplorer: 'https://celoscan.io'
  },
  // Solana Devnet
  '103': {
    name: 'Solana Devnet',
    rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    rpcUrlFallback: 'https://api.devnet.solana.com',
    wssUrl: process.env.SOLANA_WSS_URL || 'wss://api.devnet.solana.com',
    blockExplorer: 'https://explorer.solana.com/?cluster=devnet',
    type: 'solana' // Flag to indicate non-EVM chain
  }
};

// Get PaymentSplitter contract address for a chain
function getPaymentSplitterAddress(chainId) {
  console.log(`🔍 [PaymentSplitter] Looking up chainId: ${chainId} (type: ${typeof chainId})`);
  console.log(`🔍 [PaymentSplitter] Available chainIds:`, Object.keys(PAYMENT_SPLITTER_ADDRESSES));

  const address = PAYMENT_SPLITTER_ADDRESSES[chainId.toString()];
  console.log(`🔍 [PaymentSplitter] Found address: ${address} for chainId: ${chainId}`);

  if (!address || address === '0x0000000000000000000000000000000000000000') {
    console.error(`❌ [PaymentSplitter] Chain ${chainId} not found or zero address`);
    throw new Error(`PaymentSplitter not deployed on chain ${chainId}. Please deploy contract and update config.`);
  }
  return address;
}

// Get network configuration
function getNetworkConfig(chainId) {
  const config = NETWORK_CONFIGS[chainId.toString()];
  if (!config) {
    throw new Error(`Network configuration not found for chain ${chainId}`);
  }
  return config;
}

// Validate if PaymentSplitter is supported on chain
function isPaymentSplitterSupported(chainId) {
  const address = PAYMENT_SPLITTER_ADDRESSES[chainId.toString()];
  return address && address !== '0x0000000000000000000000000000000000000000';
}

// Get all supported chain IDs
function getSupportedChainIds() {
  return Object.keys(PAYMENT_SPLITTER_ADDRESSES).filter(chainId => 
    isPaymentSplitterSupported(chainId)
  );
}

module.exports = {
  PAYMENT_SPLITTER_ADDRESSES,
  PAYMENT_SPLITTER_ABI,
  NETWORK_CONFIGS,
  getPaymentSplitterAddress,
  getNetworkConfig,
  isPaymentSplitterSupported,
  getSupportedChainIds
};