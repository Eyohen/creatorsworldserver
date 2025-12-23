// PaymentSplitter Contract Integration Guide
// This file shows how to integrate with the PaymentSplitter smart contract

/**
 * PaymentSplitter Frontend Integration
 * 
 * This service handles the approve & call pattern for PaymentSplitter contracts:
 * 1. User approves the contract to spend tokens
 * 2. User calls splitPayment function
 * 3. Contract automatically splits payment between merchant and Coinley
 */

// ERC-20 Token ABI (for approve function)
const ERC20_ABI = [
  {
    "inputs": [
      { "name": "spender", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "owner", "type": "address" },
      { "name": "spender", "type": "address" }
    ],
    "name": "allowance",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

class PaymentSplitterService {
  constructor(web3Provider) {
    this.web3 = web3Provider;
  }

  /**
   * Execute PaymentSplitter payment with approve & call pattern
   * @param {Object} paymentData - Payment data from backend
   * @param {string} userAddress - User's wallet address
   */
  async executePayment(paymentData, userAddress) {
    try {
      console.log('🚀 Starting PaymentSplitter payment execution...');
      console.log('Payment data:', paymentData);

      const { contractCall, tokenAddress, chainId } = paymentData;
      const { contractAddress, params } = contractCall;

      // Create contract instances
      const tokenContract = new this.web3.eth.Contract(ERC20_ABI, tokenAddress);
      
      // Get contract ABI from backend
      const contractInfo = await this.getContractInfo(chainId);
      const splitterContract = new this.web3.eth.Contract(contractInfo.abi, contractAddress);

      // Step 1: Check current allowance
      console.log('📝 Step 1: Checking current allowance...');
      const currentAllowance = await tokenContract.methods
        .allowance(userAddress, contractAddress)
        .call();
      
      console.log('Current allowance:', currentAllowance);
      console.log('Required amount:', params.amount);

      // Step 2: Approve if needed
      if (BigInt(currentAllowance) < BigInt(params.amount)) {
        console.log('💰 Step 2: Approving token spend...');
        
        const approveTx = await tokenContract.methods
          .approve(contractAddress, params.amount)
          .send({ from: userAddress });
        
        console.log('✅ Approval transaction:', approveTx.transactionHash);
        
        // Wait for approval confirmation
        await this.waitForTransaction(approveTx.transactionHash);
      } else {
        console.log('✅ Step 2: Sufficient allowance already exists');
      }

      // Step 3: Execute splitPayment
      console.log('🔄 Step 3: Executing splitPayment...');
      
      const splitPaymentTx = await splitterContract.methods
        .splitPayment(params)
        .send({ from: userAddress });

      console.log('✅ SplitPayment transaction:', splitPaymentTx.transactionHash);
      
      return {
        success: true,
        transactionHash: splitPaymentTx.transactionHash,
        paymentId: params.paymentId
      };

    } catch (error) {
      console.error('❌ PaymentSplitter execution failed:', error);
      throw error;
    }
  }

  /**
   * Get contract information from backend
   */
  async getContractInfo(chainId) {
    const response = await fetch(`/api/payments/contract/${chainId}`);
    const result = await response.json();
    
    if (!result.success) {
      throw new Error('Failed to get contract info');
    }
    
    return result.contractInfo;
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(txHash) {
    return new Promise((resolve, reject) => {
      const checkReceipt = async () => {
        try {
          const receipt = await this.web3.eth.getTransactionReceipt(txHash);
          if (receipt) {
            if (receipt.status) {
              resolve(receipt);
            } else {
              reject(new Error('Transaction failed'));
            }
          } else {
            setTimeout(checkReceipt, 2000); // Check again in 2 seconds
          }
        } catch (error) {
          reject(error);
        }
      };
      checkReceipt();
    });
  }

  /**
   * Estimate gas for the entire payment process
   */
  async estimateGas(paymentData, userAddress) {
    try {
      const { contractCall, tokenAddress, chainId } = paymentData;
      const { contractAddress, params } = contractCall;

      const tokenContract = new this.web3.eth.Contract(ERC20_ABI, tokenAddress);
      const contractInfo = await this.getContractInfo(chainId);
      const splitterContract = new this.web3.eth.Contract(contractInfo.abi, contractAddress);

      // Check if approval is needed
      const currentAllowance = await tokenContract.methods
        .allowance(userAddress, contractAddress)
        .call();

      let approvalGas = 0;
      if (BigInt(currentAllowance) < BigInt(params.amount)) {
        approvalGas = await tokenContract.methods
          .approve(contractAddress, params.amount)
          .estimateGas({ from: userAddress });
      }

      // Estimate splitPayment gas
      const splitPaymentGas = await splitterContract.methods
        .splitPayment(params)
        .estimateGas({ from: userAddress });

      return {
        approvalGas,
        splitPaymentGas,
        totalGas: approvalGas + splitPaymentGas,
        approvalNeeded: approvalGas > 0
      };

    } catch (error) {
      console.error('Gas estimation failed:', error);
      throw error;
    }
  }
}

// Usage Example with ethers.js (more common in modern dApps)
class PaymentSplitterServiceEthers {
  constructor(provider, signer) {
    this.provider = provider;
    this.signer = signer;
  }

  async executePayment(paymentData, userAddress) {
    try {
      console.log('🚀 Starting PaymentSplitter payment (ethers.js)...');
      
      const { contractCall, tokenAddress, chainId } = paymentData;
      const { contractAddress, params } = contractCall;

      // Create contract instances
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.signer);
      
      // Get contract info
      const contractInfo = await this.getContractInfo(chainId);
      const splitterContract = new ethers.Contract(contractAddress, contractInfo.abi, this.signer);

      // Step 1: Check allowance
      const currentAllowance = await tokenContract.allowance(userAddress, contractAddress);
      
      if (currentAllowance.lt(params.amount)) {
        console.log('💰 Approving token spend...');
        
        const approveTx = await tokenContract.approve(contractAddress, params.amount);
        console.log('Approval tx:', approveTx.hash);
        
        await approveTx.wait(); // Wait for confirmation
        console.log('✅ Approval confirmed');
      }

      // Step 2: Execute payment split
      console.log('🔄 Executing splitPayment...');
      
      const splitTx = await splitterContract.splitPayment(params);
      console.log('SplitPayment tx:', splitTx.hash);
      
      const receipt = await splitTx.wait();
      console.log('✅ Payment split confirmed');

      return {
        success: true,
        transactionHash: splitTx.hash,
        paymentId: params.paymentId,
        blockNumber: receipt.blockNumber
      };

    } catch (error) {
      console.error('❌ Payment execution failed:', error);
      throw error;
    }
  }

  async getContractInfo(chainId) {
    const response = await fetch(`/api/payments/contract/${chainId}`);
    const result = await response.json();
    return result.contractInfo;
  }
}

// Integration with WAGMI (React hooks for Ethereum)
const wagmiIntegrationExample = `
import { useContractWrite, useContractRead, usePrepareContractWrite } from 'wagmi';

function PaymentComponent({ paymentData }) {
  const { contractCall, tokenAddress } = paymentData;
  
  // Prepare approval transaction
  const { config: approveConfig } = usePrepareContractWrite({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [contractCall.contractAddress, contractCall.approvalAmount],
  });
  
  const { write: approve, isLoading: isApproving } = useContractWrite(approveConfig);
  
  // Prepare splitPayment transaction
  const { config: splitConfig } = usePrepareContractWrite({
    address: contractCall.contractAddress,
    abi: PAYMENT_SPLITTER_ABI, // Get from /api/payments/contract/{chainId}
    functionName: 'splitPayment',
    args: [contractCall.params],
  });
  
  const { write: splitPayment, isLoading: isSplitting } = useContractWrite(splitConfig);
  
  const handlePayment = async () => {
    // First approve
    await approve?.();
    
    // Then split payment (user needs to confirm both transactions)
    await splitPayment?.();
  };
  
  return (
    <button 
      onClick={handlePayment} 
      disabled={isApproving || isSplitting}
    >
      {isApproving ? 'Approving...' : isSplitting ? 'Processing Payment...' : 'Pay with Contract'}
    </button>
  );
}
`;

module.exports = {
  PaymentSplitterService,
  PaymentSplitterServiceEthers,
  ERC20_ABI,
  wagmiIntegrationExample
};