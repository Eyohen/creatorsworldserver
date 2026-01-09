const express = require('express');
const router = express.Router();
const messageController = require('../controllers/message.controller');
const { verifyToken, requireOnboardingComplete } = require('../middleware/auth.middleware');
const { validate, validations } = require('../middleware/validate.middleware');

router.use(verifyToken);
router.use(requireOnboardingComplete);

// ==================== CONTACTS ====================

// Get contacts (active collaborations that can be messaged)
router.get('/contacts', messageController.getContacts);

// ==================== CONVERSATIONS ====================

// Get all conversations
router.get('/conversations', messageController.getConversations);

// Create or get a conversation
router.post('/conversations', messageController.createOrGetConversation);

// Get single conversation
router.get('/conversations/:id', messageController.getConversation);

// Get conversation for a request
router.get('/request/:requestId', messageController.getConversationByRequest);

// ==================== MESSAGES ====================

// Get messages in a conversation
router.get('/conversations/:id/messages', messageController.getMessages);

// Send message
router.post('/conversations/:id/messages',
  validations.message,
  validate,
  messageController.sendMessage
);

// Edit message
router.patch('/conversations/:conversationId/messages/:messageId', messageController.editMessage);

// Delete message
router.delete('/conversations/:conversationId/messages/:messageId', messageController.deleteMessage);

// Mark messages as read
router.put('/conversations/:id/read', messageController.markAsRead);

// ==================== REACTIONS ====================

// Add reaction to message
router.post('/conversations/:conversationId/messages/:messageId/reactions', messageController.addReaction);

// Remove reaction from message
router.delete('/conversations/:conversationId/messages/:messageId/reactions', messageController.removeReaction);

// ==================== TYPING & PRESENCE ====================

// Send typing indicator
router.post('/conversations/:id/typing', messageController.sendTyping);

// Get user presence
router.get('/users/:userId/presence', messageController.getPresence);

// Get bulk presence
router.post('/users/presence/bulk', messageController.getBulkPresence);

// ==================== ATTACHMENTS ====================

// Upload attachment (legacy - use Cloudinary)
router.post('/conversations/:id/attachments', messageController.uploadAttachment);

module.exports = router;
