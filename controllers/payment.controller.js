const crypto = require('crypto');
const db = require('../models');
const { Payment, Payout, BankAccount, Creator, Brand, CollaborationRequest } = db;
const paystackService = require('../services/paystack.service');

// Initialize payment
exports.initializePayment = async (req, res) => {
  try {
    const { requestId, amount } = req.body;
    const brand = req.brand;

    const request = await CollaborationRequest.findByPk(requestId);
    if (!request || request.brandId !== brand.id) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const reference = `CW-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const result = await paystackService.initializeTransaction({
      email: req.user.email,
      amount: amount * 100, // Convert to kobo
      reference,
      callback_url: `${process.env.CLIENT_URL}/payment/verify`,
      metadata: {
        requestId,
        brandId: brand.id,
        creatorId: request.creatorId
      }
    });

    // Create payment record
    await Payment.create({
      requestId,
      brandId: brand.id,
      creatorId: request.creatorId,
      amount,
      currency: 'NGN',
      paymentMethod: 'paystack',
      reference,
      status: 'pending'
    });

    res.json({
      success: true,
      data: {
        authorizationUrl: result.authorization_url,
        reference
      }
    });
  } catch (error) {
    console.error('Initialize payment error:', error);
    res.status(500).json({ success: false, message: 'Failed to initialize payment' });
  }
};

// Verify payment
exports.verifyPayment = async (req, res) => {
  try {
    const { reference } = req.params;

    const result = await paystackService.verifyTransaction(reference);

    const payment = await Payment.findOne({ where: { reference } });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    if (result.status === 'success') {
      await payment.update({
        status: 'completed',
        paystackReference: result.reference,
        paidAt: new Date()
      });

      // Update request status
      await CollaborationRequest.update(
        { status: 'in_progress', paymentCompletedAt: new Date() },
        { where: { id: payment.requestId } }
      );
    } else {
      await payment.update({ status: 'failed' });
    }

    res.json({ success: true, data: { status: result.status } });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify payment' });
  }
};

// Handle Paystack webhook
exports.handlePaystackWebhook = async (req, res) => {
  try {
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    const event = req.body;

    if (event.event === 'charge.success') {
      const { reference } = event.data;
      const payment = await Payment.findOne({ where: { reference } });

      if (payment && payment.status === 'pending') {
        await payment.update({
          status: 'completed',
          paystackReference: event.data.reference,
          paidAt: new Date()
        });

        await CollaborationRequest.update(
          { status: 'in_progress', paymentCompletedAt: new Date() },
          { where: { id: payment.requestId } }
        );
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Error');
  }
};

// Get earnings (Creator)
exports.getEarnings = async (req, res) => {
  try {
    const creator = req.creator;
    res.json({
      success: true,
      data: {
        totalEarnings: creator.totalEarnings,
        availableBalance: creator.availableBalance,
        pendingBalance: creator.pendingBalance
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get earnings' });
  }
};

// Get transactions
exports.getTransactions = async (req, res) => {
  try {
    const userId = req.userId;
    const creator = await Creator.findOne({ where: { userId } });
    const brand = await Brand.findOne({ where: { userId } });

    const where = {};
    if (creator) where.creatorId = creator.id;
    else if (brand) where.brandId = brand.id;

    const payments = await Payment.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    res.json({ success: true, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get transactions' });
  }
};

// Request payout (Creator)
exports.requestPayout = async (req, res) => {
  try {
    const creator = req.creator;
    const { amount, bankAccountId } = req.body;

    if (amount > creator.availableBalance) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    const bankAccount = await BankAccount.findOne({
      where: { id: bankAccountId, userId: req.userId }
    });
    if (!bankAccount) {
      return res.status(404).json({ success: false, message: 'Bank account not found' });
    }

    const payout = await Payout.create({
      creatorId: creator.id,
      bankAccountId,
      amount,
      status: 'pending'
    });

    // Deduct from available balance
    await creator.decrement('availableBalance', { by: amount });

    res.json({ success: true, data: payout });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to request payout' });
  }
};

// Get payout history (Creator)
exports.getPayoutHistory = async (req, res) => {
  try {
    const payouts = await Payout.findAll({
      where: { creatorId: req.creator.id },
      include: [{ model: BankAccount, as: 'bankAccount' }],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: payouts });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get payouts' });
  }
};

// Get bank accounts
exports.getBankAccounts = async (req, res) => {
  try {
    const accounts = await BankAccount.findAll({
      where: { userId: req.userId },
      order: [['isPrimary', 'DESC'], ['createdAt', 'DESC']]
    });
    res.json({ success: true, data: accounts });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get accounts' });
  }
};

// Add bank account
exports.addBankAccount = async (req, res) => {
  try {
    const { bankCode, accountNumber, accountName } = req.body;

    // Check if account already exists
    const existing = await BankAccount.findOne({
      where: { userId: req.userId, accountNumber, bankCode }
    });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Account already exists' });
    }

    // Check if this is first account (make it primary)
    const count = await BankAccount.count({ where: { userId: req.userId } });

    const account = await BankAccount.create({
      userId: req.userId,
      bankCode,
      bankName: req.body.bankName,
      accountNumber,
      accountName,
      isPrimary: count === 0
    });

    res.status(201).json({ success: true, data: account });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add account' });
  }
};

// Set primary bank account
exports.setPrimaryBankAccount = async (req, res) => {
  try {
    // Unset all others
    await BankAccount.update(
      { isPrimary: false },
      { where: { userId: req.userId } }
    );
    // Set this one as primary
    await BankAccount.update(
      { isPrimary: true },
      { where: { id: req.params.id, userId: req.userId } }
    );
    res.json({ success: true, message: 'Primary account updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update' });
  }
};

// Delete bank account
exports.deleteBankAccount = async (req, res) => {
  try {
    const account = await BankAccount.findOne({
      where: { id: req.params.id, userId: req.userId }
    });
    if (!account) return res.status(404).json({ success: false, message: 'Not found' });
    if (account.isPrimary) {
      return res.status(400).json({ success: false, message: 'Cannot delete primary account' });
    }
    await account.destroy();
    res.json({ success: true, message: 'Account deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete' });
  }
};

// Get bank list (Paystack)
exports.getBankList = async (req, res) => {
  try {
    const banks = await paystackService.getBanks();
    res.json({ success: true, data: banks });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get banks' });
  }
};

// Verify bank account
exports.verifyBankAccount = async (req, res) => {
  try {
    const { accountNumber, bankCode } = req.body;
    const result = await paystackService.resolveAccount(accountNumber, bankCode);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to verify account' });
  }
};
