const db = require('../models');
const { Conversation, Message, Creator, Brand, CollaborationRequest } = db;

// Get all conversations
exports.getConversations = async (req, res) => {
  try {
    const userId = req.userId;
    const creator = await Creator.findOne({ where: { userId } });
    const brand = await Brand.findOne({ where: { userId } });

    const where = {};
    if (creator) where.creatorId = creator.id;
    else if (brand) where.brandId = brand.id;

    const conversations = await Conversation.findAll({
      where,
      include: [
        { model: Creator, as: 'creator', attributes: ['displayName', 'avatarUrl'] },
        { model: Brand, as: 'brand', attributes: ['companyName', 'logo'] },
        { model: CollaborationRequest, as: 'request', attributes: ['campaignTitle', 'status'] }
      ],
      order: [['lastMessageAt', 'DESC']]
    });

    res.json({ success: true, data: conversations });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get conversations' });
  }
};

// Get single conversation
exports.getConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findByPk(req.params.id, {
      include: [
        { model: Creator, as: 'creator' },
        { model: Brand, as: 'brand' },
        { model: CollaborationRequest, as: 'request' }
      ]
    });
    if (!conversation) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: conversation });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get conversation' });
  }
};

// Get messages
exports.getMessages = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    const messages = await Message.findAndCountAll({
      where: { conversationId: req.params.id },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (page - 1) * limit
    });

    res.json({
      success: true,
      data: {
        messages: messages.rows.reverse(),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: messages.count,
          totalPages: Math.ceil(messages.count / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get messages' });
  }
};

// Send message (REST fallback)
exports.sendMessage = async (req, res) => {
  try {
    const { content, attachments } = req.body;
    const conversationId = req.params.id;

    const conversation = await Conversation.findByPk(conversationId);
    if (!conversation) return res.status(404).json({ success: false, message: 'Not found' });

    const message = await Message.create({
      conversationId,
      senderId: req.userId,
      content,
      attachments
    });

    await conversation.update({
      lastMessageId: message.id,
      lastMessageAt: new Date()
    });

    // Emit via socket if available
    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${conversationId}`).emit('new_message', message);
    }

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
};

// Mark as read
exports.markAsRead = async (req, res) => {
  try {
    const conversationId = req.params.id;
    const userId = req.userId;

    await Message.update(
      { isRead: true, readAt: new Date() },
      { where: { conversationId, senderId: { [db.Sequelize.Op.ne]: userId }, isRead: false } }
    );

    // Reset unread count
    const conversation = await Conversation.findByPk(conversationId);
    const creator = await Creator.findOne({ where: { userId } });

    if (creator && creator.id === conversation.creatorId) {
      await conversation.update({ creatorUnreadCount: 0 });
    } else {
      await conversation.update({ brandUnreadCount: 0 });
    }

    res.json({ success: true, message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to mark as read' });
  }
};

// Get conversation by request
exports.getConversationByRequest = async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      where: { requestId: req.params.requestId },
      include: [
        { model: Creator, as: 'creator' },
        { model: Brand, as: 'brand' }
      ]
    });
    if (!conversation) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: conversation });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get conversation' });
  }
};

// Upload attachment
exports.uploadAttachment = async (req, res) => {
  try {
    // TODO: Implement file upload
    res.status(501).json({ success: false, message: 'Not implemented' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to upload' });
  }
};
