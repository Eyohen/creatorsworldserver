const { Op } = require('sequelize');
const db = require('../models');
const {
  User, Creator, Brand, Admin, CollaborationRequest, Payment, Payout,
  Contract, Category, Industry, TierConfiguration, ContractTemplate,
  PlatformSettings, AuditLog
} = db;

// Dashboard stats
exports.getDashboardStats = async (req, res) => {
  try {
    const [totalUsers, totalCreators, totalBrands, activeRequests, totalPayments] = await Promise.all([
      User.count(),
      Creator.count(),
      Brand.count(),
      CollaborationRequest.count({ where: { status: { [Op.notIn]: ['completed', 'cancelled', 'declined'] } } }),
      Payment.sum('amount', { where: { status: 'completed' } })
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalCreators,
        totalBrands,
        activeRequests,
        totalPayments: totalPayments || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get stats' });
  }
};

// Dashboard charts
exports.getDashboardCharts = async (req, res) => {
  try {
    // TODO: Implement chart data aggregation
    res.json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get charts' });
  }
};

// User management
exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, userType, q } = req.query;
    const where = {};
    if (status) where.status = status;
    if (userType) where.userType = userType;
    if (q) where.email = { [Op.iLike]: `%${q}%` };

    const users = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        users: users.rows,
        pagination: { page: parseInt(page), limit: parseInt(limit), total: users.count, totalPages: Math.ceil(users.count / limit) }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get users' });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, { attributes: { exclude: ['password'] } });
    if (!user) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get user' });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Not found' });
    await user.update({ status: req.body.status });
    await AuditLog.create({ adminId: req.admin.id, action: 'update_user_status', targetType: 'user', targetId: user.id, details: { newStatus: req.body.status } });
    res.json({ success: true, message: 'Status updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Not found' });
    await user.destroy();
    await AuditLog.create({ adminId: req.admin.id, action: 'delete_user', targetType: 'user', targetId: req.params.id });
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete' });
  }
};

// Creator management
exports.getCreators = async (req, res) => {
  try {
    const { page = 1, limit = 20, tier, verified } = req.query;
    const where = {};
    if (tier) where.tier = tier;
    if (verified) where.verificationStatus = verified;

    const creators = await Creator.findAndCountAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['email', 'status'] }],
      limit: parseInt(limit),
      offset: (page - 1) * limit
    });

    res.json({ success: true, data: { creators: creators.rows, pagination: { page: parseInt(page), limit: parseInt(limit), total: creators.count } } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get creators' });
  }
};

exports.getCreatorById = async (req, res) => {
  try {
    const creator = await Creator.findByPk(req.params.id, { include: [{ model: User, as: 'user' }] });
    if (!creator) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: creator });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get creator' });
  }
};

exports.verifyCreator = async (req, res) => {
  try {
    const creator = await Creator.findByPk(req.params.id);
    if (!creator) return res.status(404).json({ success: false, message: 'Not found' });
    await creator.update({ verificationStatus: req.body.status, verifiedAt: req.body.status === 'verified' ? new Date() : null });
    res.json({ success: true, message: 'Verification updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to verify' });
  }
};

exports.updateCreatorTier = async (req, res) => {
  try {
    const creator = await Creator.findByPk(req.params.id);
    if (!creator) return res.status(404).json({ success: false, message: 'Not found' });
    await creator.update({ tier: req.body.tier });
    res.json({ success: true, message: 'Tier updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update tier' });
  }
};

// Brand management
exports.getBrands = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const brands = await Brand.findAndCountAll({
      include: [{ model: User, as: 'user', attributes: ['email', 'status'] }],
      limit: parseInt(limit),
      offset: (page - 1) * limit
    });
    res.json({ success: true, data: { brands: brands.rows, pagination: { page: parseInt(page), limit: parseInt(limit), total: brands.count } } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get brands' });
  }
};

exports.getBrandById = async (req, res) => {
  try {
    const brand = await Brand.findByPk(req.params.id, { include: [{ model: User, as: 'user' }] });
    if (!brand) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: brand });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get brand' });
  }
};

exports.verifyBrand = async (req, res) => {
  try {
    const brand = await Brand.findByPk(req.params.id);
    if (!brand) return res.status(404).json({ success: false, message: 'Not found' });
    await brand.update({ isVerified: req.body.isVerified, verifiedAt: req.body.isVerified ? new Date() : null });
    res.json({ success: true, message: 'Verification updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to verify' });
  }
};

// Request management
exports.getRequests = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const where = {};
    if (status) where.status = status;

    const requests = await CollaborationRequest.findAndCountAll({
      where,
      include: [
        { model: Creator, as: 'creator', attributes: ['displayName'] },
        { model: Brand, as: 'brand', attributes: ['companyName'] }
      ],
      limit: parseInt(limit),
      offset: (page - 1) * limit
    });
    res.json({ success: true, data: { requests: requests.rows, pagination: { page: parseInt(page), limit: parseInt(limit), total: requests.count } } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get requests' });
  }
};

exports.getRequestById = async (req, res) => {
  try {
    const request = await CollaborationRequest.findByPk(req.params.id, {
      include: [{ model: Creator, as: 'creator' }, { model: Brand, as: 'brand' }]
    });
    if (!request) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: request });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get request' });
  }
};

exports.interveneRequest = async (req, res) => {
  try {
    const request = await CollaborationRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Not found' });
    await request.update({ adminNotes: req.body.notes, status: req.body.status || request.status });
    await AuditLog.create({ adminId: req.admin.id, action: 'intervene_request', targetType: 'request', targetId: request.id, details: req.body });
    res.json({ success: true, message: 'Intervention recorded' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to intervene' });
  }
};

// Payment management
exports.getPayments = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const where = {};
    if (status) where.status = status;

    const payments = await Payment.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: { payments: payments.rows, pagination: { page: parseInt(page), limit: parseInt(limit), total: payments.count } } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get payments' });
  }
};

exports.getPayouts = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const where = {};
    if (status) where.status = status;

    const payouts = await Payout.findAndCountAll({
      where,
      include: [{ model: Creator, as: 'creator', attributes: ['displayName'] }],
      limit: parseInt(limit),
      offset: (page - 1) * limit
    });
    res.json({ success: true, data: { payouts: payouts.rows, pagination: { page: parseInt(page), limit: parseInt(limit), total: payouts.count } } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get payouts' });
  }
};

exports.processPayout = async (req, res) => {
  try {
    const payout = await Payout.findByPk(req.params.id);
    if (!payout) return res.status(404).json({ success: false, message: 'Not found' });
    await payout.update({ status: req.body.status, processedAt: new Date(), processedBy: req.admin.id });
    res.json({ success: true, message: 'Payout processed' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to process' });
  }
};

exports.refundPayment = async (req, res) => {
  try {
    // TODO: Implement Paystack refund
    res.status(501).json({ success: false, message: 'Refund not implemented' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to refund' });
  }
};

// Contract management
exports.getContracts = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const contracts = await Contract.findAndCountAll({
      limit: parseInt(limit),
      offset: (page - 1) * limit
    });
    res.json({ success: true, data: { contracts: contracts.rows, pagination: { page: parseInt(page), limit: parseInt(limit), total: contracts.count } } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get contracts' });
  }
};

exports.voidContract = async (req, res) => {
  try {
    const contract = await Contract.findByPk(req.params.id);
    if (!contract) return res.status(404).json({ success: false, message: 'Not found' });
    await contract.update({ status: 'voided', voidedAt: new Date(), voidedBy: req.admin.id, voidReason: req.body.reason });
    res.json({ success: true, message: 'Contract voided' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to void' });
  }
};

// Category/Industry CRUD (simplified)
exports.getCategories = async (req, res) => { try { res.json({ success: true, data: await Category.findAll() }); } catch (e) { res.status(500).json({ success: false }); } };
exports.createCategory = async (req, res) => { try { res.json({ success: true, data: await Category.create(req.body) }); } catch (e) { res.status(500).json({ success: false }); } };
exports.updateCategory = async (req, res) => { try { await Category.update(req.body, { where: { id: req.params.id } }); res.json({ success: true }); } catch (e) { res.status(500).json({ success: false }); } };
exports.deleteCategory = async (req, res) => { try { await Category.destroy({ where: { id: req.params.id } }); res.json({ success: true }); } catch (e) { res.status(500).json({ success: false }); } };

exports.getIndustries = async (req, res) => { try { res.json({ success: true, data: await Industry.findAll() }); } catch (e) { res.status(500).json({ success: false }); } };
exports.createIndustry = async (req, res) => { try { res.json({ success: true, data: await Industry.create(req.body) }); } catch (e) { res.status(500).json({ success: false }); } };
exports.updateIndustry = async (req, res) => { try { await Industry.update(req.body, { where: { id: req.params.id } }); res.json({ success: true }); } catch (e) { res.status(500).json({ success: false }); } };
exports.deleteIndustry = async (req, res) => { try { await Industry.destroy({ where: { id: req.params.id } }); res.json({ success: true }); } catch (e) { res.status(500).json({ success: false }); } };

// Tiers
exports.getTiers = async (req, res) => { try { res.json({ success: true, data: await TierConfiguration.findAll() }); } catch (e) { res.status(500).json({ success: false }); } };
exports.updateTier = async (req, res) => { try { await TierConfiguration.update(req.body, { where: { id: req.params.id } }); res.json({ success: true }); } catch (e) { res.status(500).json({ success: false }); } };

// Templates
exports.getTemplates = async (req, res) => { try { res.json({ success: true, data: await ContractTemplate.findAll() }); } catch (e) { res.status(500).json({ success: false }); } };
exports.createTemplate = async (req, res) => { try { res.json({ success: true, data: await ContractTemplate.create(req.body) }); } catch (e) { res.status(500).json({ success: false }); } };
exports.updateTemplate = async (req, res) => { try { await ContractTemplate.update(req.body, { where: { id: req.params.id } }); res.json({ success: true }); } catch (e) { res.status(500).json({ success: false }); } };
exports.deleteTemplate = async (req, res) => { try { await ContractTemplate.destroy({ where: { id: req.params.id } }); res.json({ success: true }); } catch (e) { res.status(500).json({ success: false }); } };

// Settings
exports.getSettings = async (req, res) => { try { res.json({ success: true, data: await PlatformSettings.findAll() }); } catch (e) { res.status(500).json({ success: false }); } };
exports.updateSettings = async (req, res) => { try { for (const [key, value] of Object.entries(req.body)) { await PlatformSettings.update({ value }, { where: { key } }); } res.json({ success: true }); } catch (e) { res.status(500).json({ success: false }); } };

// Audit logs
exports.getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const logs = await AuditLog.findAndCountAll({
      include: [{ model: Admin, as: 'admin', attributes: ['firstName', 'lastName'] }],
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: { logs: logs.rows, pagination: { page: parseInt(page), limit: parseInt(limit), total: logs.count } } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get logs' });
  }
};

// Reports
exports.getRevenueReport = async (req, res) => { res.json({ success: true, data: {} }); };
exports.getUsersReport = async (req, res) => { res.json({ success: true, data: {} }); };
exports.getCollaborationsReport = async (req, res) => { res.json({ success: true, data: {} }); };
exports.exportReport = async (req, res) => { res.status(501).json({ success: false, message: 'Export not implemented' }); };
