/**
 * Custom BEP20 (BNB Smart Chain) payout module
 * Sends USDT transfers from admin wallet to users
 * 
 * Security: Admin private key stored ONLY in environment variables (never in DB)
 */

import { ethers } from 'ethers';

const ADMIN_PRIVATE_KEY = process.env.BEP20_ADMIN_PRIVATE_KEY;
const BNB_RPC_URL      = process.env.BNB_RPC_URL || 'https://bsc-dataseed.binance.org/';
const USDT_CONTRACT    = '0x55d398326f99059fF775485246999027B3197955'; // USDT on BNB Chain
const CHAIN_ID         = 56; // BNB Smart Chain mainnet

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function balanceOf(address owner) view returns (uint256)',
];

export function isBEP20Address(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export async function validateBEP20Address(address: string): Promise<boolean> {
  if (!isBEP20Address(address)) return false;
  try {
    const provider = new ethers.JsonRpcProvider(BNB_RPC_URL, CHAIN_ID);
    const code = await provider.getCode(address);
    return code === '0x';
  } catch {
    return false;
  }
}

function getAdminWallet(): ethers.Wallet {
  if (!ADMIN_PRIVATE_KEY) {
    throw new Error('BEP20_ADMIN_PRIVATE_KEY not configured in environment variables');
  }
  const provider = new ethers.JsonRpcProvider(BNB_RPC_URL, CHAIN_ID);
  return new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);
}

export interface PayoutResult {
  txHash:  string;
  status:  'pending' | 'confirmed' | 'failed';
  success: boolean;
  message: string;
}

export async function sendBEP20Payout(
  toAddress: string,
  amount: number,
  transactionId: string,
): Promise<PayoutResult> {
  try {
    if (!isBEP20Address(toAddress)) {
      return { txHash: '', status: 'failed', success: false, message: 'Invalid BEP20 address' };
    }

    const wallet = getAdminWallet();
    const provider = wallet.provider as ethers.JsonRpcProvider;

    const usdt = new ethers.Contract(USDT_CONTRACT, ERC20_ABI, wallet);

    const amountWei = ethers.parseUnits(amount.toFixed(6), 6);

    const adminBalance = await usdt.balanceOf(wallet.address);
    if (adminBalance < amountWei) {
      return { 
        txHash: '', 
        status: 'failed', 
        success: false, 
        message: `Insufficient USDT balance. Admin has ${ethers.formatUnits(adminBalance, 6)} USDT` 
      };
    }

    const gasPrice = await provider.getFeeData();
    const gasLimit = BigInt(75000);

    const tx = await usdt.transfer(toAddress, amountWei, {
      gasLimit,
      gasPrice: gasPrice.gasPrice || BigInt(5000000000),
    });

    console.log(`BEP20 payout tx sent: ${tx.hash} | amount: ${amount} USDT | to: ${toAddress} | txId: ${transactionId}`);

    let confirmed = false;
    let attempts = 0;
    
    while (!confirmed && attempts < 10) {
      await new Promise(r => setTimeout(r, 3000));
      const receipt = await provider.getTransactionReceipt(tx.hash);
      if (receipt && receipt.status === 1) {
        confirmed = true;
        console.log(`BEP20 payout confirmed: ${tx.hash}`);
        return {
          txHash:  tx.hash,
          status:  'confirmed',
          success: true,
          message: `Withdrawal confirmed. Tx: ${tx.hash.slice(0, 10)}...`,
        };
      }
      attempts++;
    }

    return {
      txHash:  tx.hash,
      status:  'pending',
      success: true,
      message: `Transaction sent. Tx: ${tx.hash.slice(0, 10)}... (confirming...)`,
    };
  } catch (error: any) {
    console.error(`BEP20 payout error:`, error?.message || error);
    return {
      txHash:  '',
      status:  'failed',
      success: false,
      message: error?.message || 'Payout failed',
    };
  }
}

export async function getAdminBEP20Balance(): Promise<number> {
  try {
    const wallet = getAdminWallet();
    const provider = wallet.provider as ethers.JsonRpcProvider;
    const usdt = new ethers.Contract(USDT_CONTRACT, ERC20_ABI, provider);
    const balance = await usdt.balanceOf(wallet.address);
    return parseFloat(ethers.formatUnits(balance, 6));
  } catch (error) {
    console.error('Error getting admin BEP20 balance:', error);
    return 0;
  }
}
