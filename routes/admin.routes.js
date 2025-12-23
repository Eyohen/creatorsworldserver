const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { verifyToken, requireAdmin, requirePermission } = require('../middleware/auth.middleware');

router.use(verifyToken);
router.use(requireAdmin);

// Dashboard
router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/dashboard/charts', adminController.getDashboardCharts);

// User management
router.get('/users', requirePermission('users:read'), adminController.getUsers);
router.get('/users/:id', requirePermission('users:read'), adminController.getUserById);
router.put('/users/:id/status', requirePermission('users:write'), adminController.updateUserStatus);
router.delete('/users/:id', requirePermission('users:delete'), adminController.deleteUser);

// Creator management
router.get('/creators', requirePermission('creators:read'), adminController.getCreators);
router.get('/creators/:id', requirePermission('creators:read'), adminController.getCreatorById);
router.put('/creators/:id/verify', requirePermission('creators:verify'), adminController.verifyCreator);
router.put('/creators/:id/tier', requirePermission('creators:write'), adminController.updateCreatorTier);

// Brand management
router.get('/brands', requirePermission('brands:read'), adminController.getBrands);
router.get('/brands/:id', requirePermission('brands:read'), adminController.getBrandById);
router.put('/brands/:id/verify', requirePermission('brands:verify'), adminController.verifyBrand);

// Request/Collaboration management
router.get('/requests', requirePermission('requests:read'), adminController.getRequests);
router.get('/requests/:id', requirePermission('requests:read'), adminController.getRequestById);
router.put('/requests/:id/intervene', requirePermission('requests:intervene'), adminController.interveneRequest);

// Payment management
router.get('/payments', requirePermission('payments:read'), adminController.getPayments);
router.get('/payouts', requirePermission('payments:read'), adminController.getPayouts);
router.put('/payouts/:id/process', requirePermission('payments:write'), adminController.processPayout);
router.post('/payments/:id/refund', requirePermission('payments:refund'), adminController.refundPayment);

// Contract management
router.get('/contracts', requirePermission('contracts:read'), adminController.getContracts);
router.put('/contracts/:id/void', requirePermission('contracts:void'), adminController.voidContract);

// Category management
router.get('/categories', requirePermission('categories:read'), adminController.getCategories);
router.post('/categories', requirePermission('categories:write'), adminController.createCategory);
router.put('/categories/:id', requirePermission('categories:write'), adminController.updateCategory);
router.delete('/categories/:id', requirePermission('categories:delete'), adminController.deleteCategory);

// Industry management
router.get('/industries', requirePermission('categories:read'), adminController.getIndustries);
router.post('/industries', requirePermission('categories:write'), adminController.createIndustry);
router.put('/industries/:id', requirePermission('categories:write'), adminController.updateIndustry);
router.delete('/industries/:id', requirePermission('categories:delete'), adminController.deleteIndustry);

// Tier configuration
router.get('/tiers', requirePermission('tiers:read'), adminController.getTiers);
router.put('/tiers/:id', requirePermission('tiers:write'), adminController.updateTier);

// Contract templates
router.get('/templates', requirePermission('templates:read'), adminController.getTemplates);
router.post('/templates', requirePermission('templates:write'), adminController.createTemplate);
router.put('/templates/:id', requirePermission('templates:write'), adminController.updateTemplate);
router.delete('/templates/:id', requirePermission('templates:delete'), adminController.deleteTemplate);

// Platform settings
router.get('/settings', requirePermission('settings:read'), adminController.getSettings);
router.put('/settings', requirePermission('settings:write'), adminController.updateSettings);

// Audit logs
router.get('/audit-logs', requirePermission('audit:read'), adminController.getAuditLogs);

// Reports
router.get('/reports/revenue', requirePermission('reports:read'), adminController.getRevenueReport);
router.get('/reports/users', requirePermission('reports:read'), adminController.getUsersReport);
router.get('/reports/collaborations', requirePermission('reports:read'), adminController.getCollaborationsReport);
router.get('/reports/export/:type', requirePermission('reports:export'), adminController.exportReport);

module.exports = router;
