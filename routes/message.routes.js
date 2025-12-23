const express = require('express');
const router = express.Router();
const messageController = require('../controllers/message.controller');
const { verifyToken, requireOnboardingComplete } = require('../middleware/auth.middleware');
const { validate, validations } = require('../middleware/validate.middleware');

router.use(verifyToken);
router.use(requireOnboardingComplete);

// Get all conversations
router.get('/conversations', messageController.getConversations);

// Get single conversation
router.get('/conversations/:id', messageController.getConversation);

// Get messages in a conversation
router.get('/conversations/:id/messages', messageController.getMessages);

// Send message (REST fallback - prefer Socket.io)
router.post('/conversations/:id/messages',
  validations.message,
  validate,
  messageController.sendMessage
);

// Mark messages as read
router.put('/conversations/:id/read', messageController.markAsRead);

// Get conversation for a request
router.get('/request/:requestId', messageController.getConversationByRequest);

// Upload attachment
router.post('/conversations/:id/attachments', messageController.uploadAttachment);

module.exports = router;
