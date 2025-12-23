# Deposit Address API Testing Guide

## Overview

This document contains cURL commands for testing the CREATE2-based deposit address payment flow across all supported chains (Base, BSC, Arbitrum).

## Configuration

Replace `API_KEY` and `API_SECRET` in the commands below with your actual merchant credentials.

---

## 1. Get Supported Chains

Check which chains support the deposit address flow:

```bash
curl -X GET "https://talented-mercy-production.up.railway.app/api/deposits/chains" \
  -H "Content-Type: application/json" \
  -H "x-api-key: API_KEY" \
  -H "x-api-secret: API_SECRET"
```

**Expected Response:**
```json
{
  "success": true,
  "chains": [
    { "chainId": "8453", "name": "Base", "supported": true },
    { "chainId": "56", "name": "BSC", "supported": true },
    { "chainId": "42161", "name": "Arbitrum", "supported": true }
  ]
}
```

---

## 2. Get Factory Info

### Base (Chain ID: 8453)

```bash
curl -X GET "https://talented-mercy-production.up.railway.app/api/deposits/factory/8453" \
  -H "Content-Type: application/json" \
  -H "x-api-key: API_KEY" \
  -H "x-api-secret: API_SECRET"
```

### BSC (Chain ID: 56)

```bash
curl -X GET "https://talented-mercy-production.up.railway.app/api/deposits/factory/56" \
  -H "Content-Type: application/json" \
  -H "x-api-key: API_KEY" \
  -H "x-api-secret: API_SECRET"
```

### Arbitrum (Chain ID: 42161)

```bash
curl -X GET "https://talented-mercy-production.up.railway.app/api/deposits/factory/42161" \
  -H "Content-Type: application/json" \
  -H "x-api-key: API_KEY" \
  -H "x-api-secret: API_SECRET"
```

**Expected Response:**
```json
{
  "success": true,
  "factory": {
    "address": "0x373A8997fFe0D1aBf42F022FaEf1F0F3551C3553",
    "implementation": "0x9439Fce7bAD99eCaF0Dc1BE87D4E256250Cf4e39",
    "chainId": "8453"
  }
}
```

---

## 3. Create Deposit Payment

### Base - USDC

```bash
curl -X POST "https://talented-mercy-production.up.railway.app/api/deposits/create" \
  -H "Content-Type: application/json" \
  -H "x-api-key: API_KEY" \
  -H "x-api-secret: API_SECRET" \
  -d '{
    "amount": "10.00",
    "currency": "USDC",
    "network": "base",
    "customerEmail": "customer@example.com",
    "metadata": {
      "orderId": "ORDER-BASE-001",
      "description": "Test deposit on Base"
    }
  }'
```

### Base - USDT

```bash
curl -X POST "https://talented-mercy-production.up.railway.app/api/deposits/create" \
  -H "Content-Type: application/json" \
  -H "x-api-key: API_KEY" \
  -H "x-api-secret: API_SECRET" \
  -d '{
    "amount": "25.00",
    "currency": "USDT",
    "network": "base",
    "customerEmail": "customer@example.com",
    "metadata": {
      "orderId": "ORDER-BASE-002",
      "description": "USDT test on Base"
    }
  }'
```

### BSC - USDT

```bash
curl -X POST "https://talented-mercy-production.up.railway.app/api/deposits/create" \
  -H "Content-Type: application/json" \
  -H "x-api-key: API_KEY" \
  -H "x-api-secret: API_SECRET" \
  -d '{
    "amount": "50.00",
    "currency": "USDT",
    "network": "bsc",
    "customerEmail": "customer@example.com",
    "metadata": {
      "orderId": "ORDER-BSC-001",
      "description": "Test deposit on BSC"
    }
  }'
```

### BSC - USDC

```bash
curl -X POST "https://talented-mercy-production.up.railway.app/api/deposits/create" \
  -H "Content-Type: application/json" \
  -H "x-api-key: API_KEY" \
  -H "x-api-secret: API_SECRET" \
  -d '{
    "amount": "100.00",
    "currency": "USDC",
    "network": "bsc",
    "customerEmail": "customer@example.com",
    "metadata": {
      "orderId": "ORDER-BSC-002",
      "description": "USDC test on BSC"
    }
  }'
```

### Arbitrum - USDC

```bash
curl -X POST "https://talented-mercy-production.up.railway.app/api/deposits/create" \
  -H "Content-Type: application/json" \
  -H "x-api-key: API_KEY" \
  -H "x-api-secret: API_SECRET" \
  -d '{
    "amount": "75.00",
    "currency": "USDC",
    "network": "arbitrum",
    "customerEmail": "customer@example.com",
    "metadata": {
      "orderId": "ORDER-ARB-001",
      "description": "Test deposit on Arbitrum"
    }
  }'
```

### Arbitrum - USDT

```bash
curl -X POST "https://talented-mercy-production.up.railway.app/api/deposits/create" \
  -H "Content-Type: application/json" \
  -H "x-api-key: API_KEY" \
  -H "x-api-secret: API_SECRET" \
  -d '{
    "amount": "200.00",
    "currency": "USDT",
    "network": "arbitrum",
    "customerEmail": "customer@example.com",
    "metadata": {
      "orderId": "ORDER-ARB-002",
      "description": "USDT test on Arbitrum"
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "payment": {
    "id": "pay_abc123",
    "depositAddress": "0x1234567890abcdef...",
    "amount": "10.00",
    "currency": "USDC",
    "network": "base",
    "status": "pending",
    "expiresAt": "2024-12-12T12:00:00.000Z",
    "requiredConfirmations": 20
  }
}
```

---

## 4. Check Deposit Status

Replace `PAYMENT_ID` with the actual payment ID from the create response:

```bash
# Generic command
curl -X GET "https://talented-mercy-production.up.railway.app/api/deposits/PAYMENT_ID/status" \
  -H "Content-Type: application/json" \
  -H "x-api-key: API_KEY" \
  -H "x-api-secret: API_SECRET"
```

**Example with actual payment ID:**
```bash
curl -X GET "https://talented-mercy-production.up.railway.app/api/deposits/pay_abc123/status" \
  -H "Content-Type: application/json" \
  -H "x-api-key: API_KEY" \
  -H "x-api-secret: API_SECRET"
```

**Expected Response (Pending):**
```json
{
  "success": true,
  "status": "pending",
  "depositAddress": "0x...",
  "amount": "10.00",
  "currency": "USDC",
  "confirmations": 0,
  "requiredConfirmations": 20
}
```

**Expected Response (Completed):**
```json
{
  "success": true,
  "status": "completed",
  "depositAddress": "0x...",
  "amount": "10.00",
  "currency": "USDC",
  "confirmations": 25,
  "requiredConfirmations": 20,
  "depositTxHash": "0xabc...",
  "confirmedAt": "2024-12-11T10:30:00.000Z"
}
```

**Expected Response (Swept):**
```json
{
  "success": true,
  "status": "completed",
  "depositAddress": "0x...",
  "amount": "10.00",
  "currency": "USDC",
  "confirmations": 25,
  "requiredConfirmations": 20,
  "depositTxHash": "0xabc...",
  "sweepTxHash": "0xdef...",
  "confirmedAt": "2024-12-11T10:30:00.000Z",
  "sweptAt": "2024-12-11T10:35:00.000Z"
}
```

---

## 5. Check Deposit Balance

Check the real-time balance at the deposit address:

```bash
curl -X GET "https://talented-mercy-production.up.railway.app/api/deposits/PAYMENT_ID/balance" \
  -H "Content-Type: application/json" \
  -H "x-api-key: API_KEY" \
  -H "x-api-secret: API_SECRET"
```

**Expected Response:**
```json
{
  "success": true,
  "depositAddress": "0x...",
  "balance": "10.00",
  "token": "USDC",
  "rawBalance": "10000000"
}
```

---

## 6. Manual Sweep (Admin Only)

Trigger a manual sweep for a confirmed payment:

```bash
curl -X POST "https://talented-mercy-production.up.railway.app/api/deposits/PAYMENT_ID/sweep" \
  -H "Content-Type: application/json" \
  -H "x-api-key: API_KEY" \
  -H "x-api-secret: API_SECRET"
```

**Expected Response:**
```json
{
  "success": true,
  "sweepTxHash": "0x...",
  "status": "swept"
}
```

---

## Quick Test Script

Save this as `test-deposit-api.sh` and run with `bash test-deposit-api.sh`:

```bash
#!/bin/bash

# Replace API_KEY and API_SECRET with your credentials

# 1. Get supported chains
curl -s -X GET "https://talented-mercy-production.up.railway.app/api/deposits/chains" \
  -H "Content-Type: application/json" \
  -H "x-api-key: API_KEY" \
  -H "x-api-secret: API_SECRET"

# 2. Get factory info (Base)
curl -s -X GET "https://talented-mercy-production.up.railway.app/api/deposits/factory/8453" \
  -H "Content-Type: application/json" \
  -H "x-api-key: API_KEY" \
  -H "x-api-secret: API_SECRET"

# 3. Create deposit (Base USDC)
curl -s -X POST "https://talented-mercy-production.up.railway.app/api/deposits/create" \
  -H "Content-Type: application/json" \
  -H "x-api-key: API_KEY" \
  -H "x-api-secret: API_SECRET" \
  -d '{"amount":"1.00","currency":"USDC","network":"base","customerEmail":"test@example.com"}'

# 4. Check status (replace PAYMENT_ID)
curl -s -X GET "https://talented-mercy-production.up.railway.app/api/deposits/PAYMENT_ID/status" \
  -H "Content-Type: application/json" \
  -H "x-api-key: API_KEY" \
  -H "x-api-secret: API_SECRET"

# 5. Check balance (replace PAYMENT_ID)
curl -s -X GET "https://talented-mercy-production.up.railway.app/api/deposits/PAYMENT_ID/balance" \
  -H "Content-Type: application/json" \
  -H "x-api-key: API_KEY" \
  -H "x-api-secret: API_SECRET"
```

---

## Status Flow Reference

```
pending → detected → confirming → completed → swept
                                          ↘ failed (on error)
```

| Status | Description |
|--------|-------------|
| `pending` | Payment created, waiting for deposit |
| `detected` | Deposit transaction seen (0 confirmations) |
| `confirming` | Deposit has some confirmations |
| `completed` | Required confirmations reached |
| `swept` | Funds swept to merchant wallet |
| `failed` | Sweep failed (will retry) |
| `expired` | No deposit received before expiry |

---

## Supported Tokens by Network

### Base (Chain ID: 8453)
- USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- USDT: `0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2`

### BSC (Chain ID: 56)
- USDT: `0x55d398326f99059fF775485246999027B3197955`
- USDC: `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d`

### Arbitrum (Chain ID: 42161)
- USDC: `0xaf88d065e77c8cC2239327C5EDb3A432268e5831`
- USDT: `0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9`

---

## Factory Contract Addresses

All chains use the same addresses (deterministic CREATE2 deployment):

| Contract | Address |
|----------|---------|
| Factory | `0x373A8997fFe0D1aBf42F022FaEf1F0F3551C3553` |
| Implementation | `0x9439Fce7bAD99eCaF0Dc1BE87D4E256250Cf4e39` |

---

## Troubleshooting

### "Deposit factory not supported on this chain"
The requested chain doesn't have a deployed factory. Currently supported: Base (8453), BSC (56), Arbitrum (42161).

### "Token not supported on network"
The token/network combination isn't configured. Check supported tokens list above.

### "Payment not found"
The payment ID doesn't exist or doesn't belong to your merchant.

### "Cannot sweep - not enough confirmations"
The deposit hasn't reached the required confirmation count yet. Wait for more blocks.

### "Sweep failed"
The sweep transaction failed. Check sweeper wallet has gas. The system will auto-retry.
