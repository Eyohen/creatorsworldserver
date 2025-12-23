// config/solana.js - Solana MAINNET configuration (production only)

// Alchemy RPC endpoint for Solana mainnet
const SOLANA_RPC_URL = process.env.SOLANA_MAINNET_RPC_URL || 'https://solana-mainnet.g.alchemy.com/v2/YWG990wOlIikc1tU7-WWTepfU8d1f4dp';

// Mainnet token mint addresses
const SOLANA_TOKEN_MINTS = {
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
};

// Token decimals (same for all networks)
const TOKEN_DECIMALS = {
  USDC: 6,
  USDT: 6,
};

// Solana program IDs
const SOLANA_PROGRAMS = {
  TOKEN_PROGRAM_ID: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  ASSOCIATED_TOKEN_PROGRAM_ID: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
};

// Get RPC URL (always mainnet)
function getSolanaRpcUrl() {
  console.log('[Solana Config] 🔗 getSolanaRpcUrl() → Using MAINNET RPC');
  console.log('[Solana Config]    URL:', SOLANA_RPC_URL.substring(0, 50) + '...');
  return SOLANA_RPC_URL;
}

// Get token mint address (always mainnet)
function getTokenMint(symbol) {
  const mint = SOLANA_TOKEN_MINTS[symbol.toUpperCase()];
  if (!mint) {
    console.error(`[Solana Config] ❌ Token ${symbol} not supported on Solana mainnet`);
    throw new Error(`Token ${symbol} not supported on Solana mainnet`);
  }
  console.log(`[Solana Config] 🪙 getTokenMint(${symbol}) → ${mint}`);
  return mint;
}

// Get Coinley fee wallet from PlatformSettings or env var
async function getCoinleyWalletFromDb() {
  console.log('[Solana Config] 🔍 Looking up Coinley fee wallet...');

  try {
    const { PlatformSettings } = require('../models');
    const settings = await PlatformSettings.findOne({
      where: { settingKey: 'fee_wallets' }
    });

    if (settings) {
      const wallet = settings.getFeeWalletForNetwork('solana');
      if (wallet) {
        console.log(`[Solana Config] ✅ Found wallet in PlatformSettings: ${wallet}`);
        return wallet;
      }
      console.log('[Solana Config] ⚠️ PlatformSettings exists but no Solana wallet configured');
    } else {
      console.log('[Solana Config] ⚠️ No PlatformSettings found for fee_wallets');
    }

    // Fallback to env var
    const envWallet = process.env.COINLEY_SOLANA_MAINNET_WALLET;
    if (envWallet) {
      console.log(`[Solana Config] ✅ Using env var COINLEY_SOLANA_MAINNET_WALLET: ${envWallet}`);
      return envWallet;
    }

    console.error('[Solana Config] ❌ No Coinley Solana wallet configured!');
    console.error('[Solana Config]    Please set COINLEY_SOLANA_MAINNET_WALLET env var or configure in admin console');
    throw new Error('Coinley Solana mainnet wallet not configured. Set COINLEY_SOLANA_MAINNET_WALLET env var.');
  } catch (error) {
    // If PlatformSettings table doesn't exist, check env var
    console.error(`[Solana Config] ⚠️ Error reading PlatformSettings: ${error.message}`);

    const envWallet = process.env.COINLEY_SOLANA_MAINNET_WALLET;
    if (envWallet) {
      console.log(`[Solana Config] ✅ Using env var COINLEY_SOLANA_MAINNET_WALLET: ${envWallet}`);
      return envWallet;
    }

    console.error('[Solana Config] ❌ No Coinley Solana wallet configured!');
    throw new Error('Coinley Solana wallet not configured: ' + error.message);
  }
}

// Get token decimals
function getTokenDecimals(symbol) {
  const decimals = TOKEN_DECIMALS[symbol.toUpperCase()] || 6;
  console.log(`[Solana Config] 📊 getTokenDecimals(${symbol}) → ${decimals}`);
  return decimals;
}

// Check if Solana is supported
async function isSolanaSupported() {
  try {
    await getCoinleyWalletFromDb();
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  SOLANA_RPC_URL,
  SOLANA_TOKEN_MINTS,
  TOKEN_DECIMALS,
  SOLANA_PROGRAMS,
  getSolanaRpcUrl,
  getTokenMint,
  getCoinleyWalletFromDb,
  getTokenDecimals,
  isSolanaSupported,
};
