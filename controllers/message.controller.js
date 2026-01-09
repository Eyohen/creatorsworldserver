const db = require('../models');
const { Conversation, Message, Creator, Brand, User, CollaborationRequest } = db;
const papersignal = require('../services/papersignal.service');

// Helper: Get user display info
const getUserDisplayInfo = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user) return null;

  if (user.userType === 'creator') {
    const creator = await Creator.findOne({ where: { userId } });
    return {
      id: userId,
      displayName: creator?.displayName || 'Creator',
      avatar: creator?.profileImage || null,
      entityId: creator?.id,
      entityType: 'creator'
    };
  } else if (user.userType === 'brand') {
    const brand = await Brand.findOne({ where: { userId } });
    return {
      id: userId,
      displayName: brand?.companyName || 'Brand',
      avatar: brand?.logo || null,
      entityId: brand?.id,
      entityType: 'brand'
    };
  }
  return null;
};

// Helper: Get or create Papersignal room for a conversation
const ensurePapersignalRoom = async (conversation) => {
  if (conversation.papersignalRoomId) {
    return { roomId: conversation.papersignalRoomId, conversation };
  }

  // Get user info for both participants
  const creator = await Creator.findByPk(conversation.creatorId, {
    include: [{ model: User, as: 'user' }]
  });
  const brand = await Brand.findByPk(conversation.brandId, {
    include: [{ model: User, as: 'user' }]
  });

  if (!creator || !brand) {
    throw new Error('Participants not found');
  }

  // Create room in Papersignal
  const result = await papersignal.getOrCreateDirectConversation(
    {
      id: creator.user.id,
      displayName: creator.displayName || 'Creator',
      avatar: creator.profileImage
    },
    {
      id: brand.user.id,
      displayName: brand.companyName || 'Brand',
      avatar: brand.logo
    },
    {
      localConversationId: conversation.id,
      requestId: conversation.requestId,
      creatorId: conversation.creatorId,
      brandId: conversation.brandId
    }
  );

  const papersignalRoomId = result.room.id;

  // Check if another conversation already has this Papersignal room ID
  const existingWithRoom = await Conversation.findOne({
    where: { papersignalRoomId },
    include: [
      { model: Creator, as: 'creator', include: [{ model: User, as: 'user', attributes: ['id'] }] },
      { model: Brand, as: 'brand', include: [{ model: User, as: 'user', attributes: ['id'] }] },
      { model: CollaborationRequest, as: 'request' }
    ]
  });

  if (existingWithRoom) {
    // Another conversation already has this room - delete the duplicate and return the existing one
    if (existingWithRoom.id !== conversation.id) {
      await conversation.destroy();
    }
    return { roomId: papersignalRoomId, conversation: existingWithRoom };
  }

  // Store the Papersignal room ID
  await conversation.update({ papersignalRoomId });

  return { roomId: papersignalRoomId, conversation };
};

// Helper: Transform Papersignal message to local format
const transformMessage = (psMessage, currentUserId) => {
  return {
    id: psMessage.id,
    senderId: psMessage.userId || psMessage.sender?.externalId,
    senderName: psMessage.userName || psMessage.sender?.displayName,
    senderAvatar: psMessage.userAvatar || psMessage.sender?.avatarUrl,
    content: psMessage.content,
    messageType: psMessage.messageType || 'text',
    attachments: psMessage.attachments || [],
    reactions: psMessage.reactions || {},
    isEdited: psMessage.edited || psMessage.editedAt != null,
    isDeleted: psMessage.isDeleted || psMessage.deleted,
    createdAt: psMessage.createdAt,
    updatedAt: psMessage.updatedAt
  };
};

// ==================== CONVERSATIONS ====================

// Get all conversations
exports.getConversations = async (req, res) => {
  try {
    const userId = req.userId;
    const userInfo = await getUserDisplayInfo(userId);

    if (!userInfo) {
      return res.status(400).json({ success: false, message: 'User profile not found' });
    }

    // Get conversations from Papersignal
    let papersignalConversations = [];
    try {
      const psResult = await papersignal.getUserConversations(userId);
      papersignalConversations = psResult.conversations || [];
    } catch (err) {
      console.error('Failed to fetch from Papersignal, falling back to local:', err.message);
    }

    // Get local conversations for metadata enrichment
    const where = {};
    if (userInfo.entityType === 'creator') {
      where.creatorId = userInfo.entityId;
    } else {
      where.brandId = userInfo.entityId;
    }

    const localConversations = await Conversation.findAll({
      where,
      include: [
        { model: Creator, as: 'creator', attributes: ['id', 'displayName', 'profileImage'], include: [{ model: User, as: 'user', attributes: ['id'] }] },
        { model: Brand, as: 'brand', attributes: ['id', 'companyName', 'logo'], include: [{ model: User, as: 'user', attributes: ['id'] }] },
        { model: CollaborationRequest, as: 'request', attributes: ['id', 'title', 'status'] }
      ],
      order: [['lastMessageAt', 'DESC']]
    });

    // Create a map for quick lookup
    const localMap = new Map();
    localConversations.forEach(conv => {
      if (conv.papersignalRoomId) {
        localMap.set(conv.papersignalRoomId, conv);
      }
    });

    // Merge Papersignal data with local metadata
    const enrichedConversations = papersignalConversations.map(psConv => {
      const local = localMap.get(psConv.id);
      return {
        id: local?.id || psConv.id,
        papersignalRoomId: psConv.id,
        creator: local?.creator || null,
        brand: local?.brand || null,
        request: local?.request || null,
        lastMessage: psConv.lastMessage ? {
          content: psConv.lastMessage.content,
          createdAt: psConv.lastMessage.createdAt,
          senderName: psConv.lastMessage.userName
        } : null,
        lastMessageAt: psConv.lastMessageAt || local?.lastMessageAt,
        unreadCount: psConv.unreadCount || 0,
        isActive: local?.isActive ?? true
      };
    });

    // Add local conversations that might not be in Papersignal yet
    for (const local of localConversations) {
      if (!local.papersignalRoomId || !papersignalConversations.find(p => p.id === local.papersignalRoomId)) {
        enrichedConversations.push({
          id: local.id,
          papersignalRoomId: local.papersignalRoomId,
          creator: local.creator,
          brand: local.brand,
          request: local.request,
          lastMessage: local.lastMessagePreview ? {
            content: local.lastMessagePreview,
            createdAt: local.lastMessageAt
          } : null,
          lastMessageAt: local.lastMessageAt,
          unreadCount: userInfo.entityType === 'creator' ? local.creatorUnreadCount : local.brandUnreadCount,
          isActive: local.isActive
        });
      }
    }

    // Sort by lastMessageAt
    enrichedConversations.sort((a, b) => {
      const dateA = new Date(a.lastMessageAt || 0);
      const dateB = new Date(b.lastMessageAt || 0);
      return dateB - dateA;
    });

    res.json({ success: true, data: enrichedConversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ success: false, message: 'Failed to get conversations' });
  }
};

// Get single conversation
exports.getConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findByPk(req.params.id, {
      include: [
        { model: Creator, as: 'creator', include: [{ model: User, as: 'user', attributes: ['id'] }] },
        { model: Brand, as: 'brand', include: [{ model: User, as: 'user', attributes: ['id'] }] },
        { model: CollaborationRequest, as: 'request' }
      ]
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    // Verify user has access
    const userId = req.userId;
    const hasAccess = conversation.creator?.user?.id === userId || conversation.brand?.user?.id === userId;
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Ensure Papersignal room exists
    const { roomId, conversation: activeConversation } = await ensurePapersignalRoom(conversation);

    // Get room details from Papersignal
    let roomDetails = null;
    try {
      roomDetails = await papersignal.getRoom(roomId, { limit: 1 });
    } catch (err) {
      console.error('Failed to get Papersignal room:', err.message);
    }

    res.json({
      success: true,
      data: {
        ...activeConversation.toJSON(),
        papersignalRoom: roomDetails?.room || null
      }
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ success: false, message: 'Failed to get conversation' });
  }
};

// Get messages (from Papersignal)
exports.getMessages = async (req, res) => {
  try {
    const { page = 1, limit = 50, before } = req.query;
    const conversationId = req.params.id;

    const conversation = await Conversation.findByPk(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    // Ensure Papersignal room exists
    const { roomId } = await ensurePapersignalRoom(conversation);

    // Get messages from Papersignal
    const result = await papersignal.getRoom(roomId, { limit: parseInt(limit), before });

    const rawMessages = result.room?.messages || [];

    // Papersignal returns messages in OLDEST FIRST order
    // Frontend expects NEWEST FIRST (for flex-col-reverse display)
    const messages = rawMessages
      .map(msg => transformMessage(msg, req.userId))
      .reverse();

    res.json({
      success: true,
      data: {
        messages, // Newest first - frontend uses flex-col-reverse for display
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: messages.length === parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ success: false, message: 'Failed to get messages' });
  }
};

// Send message (via Papersignal)
exports.sendMessage = async (req, res) => {
  try {
    const { content, messageType = 'text', attachments, metadata } = req.body;
    const conversationId = req.params.id;
    const userId = req.userId;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    const conversation = await Conversation.findByPk(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    // Get user display info
    const userInfo = await getUserDisplayInfo(userId);
    if (!userInfo) {
      return res.status(400).json({ success: false, message: 'User profile not found' });
    }

    // Ensure Papersignal room exists
    const { roomId } = await ensurePapersignalRoom(conversation);

    // Send message via Papersignal
    const result = await papersignal.sendMessage(roomId, {
      userId,
      userName: userInfo.displayName,
      userAvatar: userInfo.avatar,
      content: content.trim(),
      messageType,
      metadata: {
        ...metadata,
        attachments,
        localConversationId: conversationId
      }
    });

    // Update local conversation
    await conversation.update({
      lastMessageAt: new Date(),
      lastMessagePreview: content.substring(0, 255)
    });

    // Increment unread count for the other participant
    if (userInfo.entityType === 'creator') {
      await conversation.increment('brandUnreadCount');
    } else {
      await conversation.increment('creatorUnreadCount');
    }

    // Emit via local socket for immediate UI update
    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${conversationId}`).emit('new_message', {
        ...transformMessage(result.message, userId),
        conversationId
      });
    }

    res.status(201).json({
      success: true,
      data: transformMessage(result.message, userId)
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
};

// Mark as read
exports.markAsRead = async (req, res) => {
  try {
    const conversationId = req.params.id;
    const userId = req.userId;

    const conversation = await Conversation.findByPk(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    // Mark as read in Papersignal
    if (conversation.papersignalRoomId) {
      try {
        await papersignal.markAsRead(conversation.papersignalRoomId, userId);
      } catch (err) {
        console.error('Failed to mark as read in Papersignal:', err.message);
      }
    }

    // Reset local unread count
    const userInfo = await getUserDisplayInfo(userId);
    if (userInfo?.entityType === 'creator') {
      await conversation.update({ creatorUnreadCount: 0 });
    } else {
      await conversation.update({ brandUnreadCount: 0 });
    }

    // Emit read receipt via socket
    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${conversationId}`).emit('messages_read', {
        conversationId,
        userId,
        readAt: new Date()
      });
    }

    res.json({ success: true, message: 'Marked as read' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark as read' });
  }
};

// Get conversation by request
exports.getConversationByRequest = async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      where: { requestId: req.params.requestId },
      include: [
        { model: Creator, as: 'creator', include: [{ model: User, as: 'user', attributes: ['id'] }] },
        { model: Brand, as: 'brand', include: [{ model: User, as: 'user', attributes: ['id'] }] }
      ]
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    res.json({ success: true, data: conversation });
  } catch (error) {
    console.error('Get conversation by request error:', error);
    res.status(500).json({ success: false, message: 'Failed to get conversation' });
  }
};

// ==================== NEW FEATURES ====================

// Create or get conversation (for starting new chats)
exports.createOrGetConversation = async (req, res) => {
  try {
    const { creatorId, brandId, requestId } = req.body;
    const userId = req.userId;

    if (!creatorId || !brandId) {
      return res.status(400).json({ success: false, message: 'creatorId and brandId are required' });
    }

    // Check if conversation exists
    let conversation = await Conversation.findOne({
      where: { creatorId, brandId },
      include: [
        { model: Creator, as: 'creator', include: [{ model: User, as: 'user', attributes: ['id'] }] },
        { model: Brand, as: 'brand', include: [{ model: User, as: 'user', attributes: ['id'] }] },
        { model: CollaborationRequest, as: 'request' }
      ]
    });

    let created = false;
    if (!conversation) {
      conversation = await Conversation.create({
        creatorId,
        brandId,
        requestId: requestId || null
      });
      conversation = await Conversation.findByPk(conversation.id, {
        include: [
          { model: Creator, as: 'creator', include: [{ model: User, as: 'user', attributes: ['id'] }] },
          { model: Brand, as: 'brand', include: [{ model: User, as: 'user', attributes: ['id'] }] },
          { model: CollaborationRequest, as: 'request' }
        ]
      });
      created = true;
    }

    // Ensure Papersignal room exists (may return a different conversation if duplicate was found)
    const { conversation: activeConversation } = await ensurePapersignalRoom(conversation);

    res.json({
      success: true,
      data: activeConversation,
      created
    });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ success: false, message: 'Failed to create conversation' });
  }
};

// Add reaction to message
exports.addReaction = async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.userId;

    if (!emoji) {
      return res.status(400).json({ success: false, message: 'Emoji is required' });
    }

    const conversation = await Conversation.findByPk(conversationId);
    if (!conversation || !conversation.papersignalRoomId) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const userInfo = await getUserDisplayInfo(userId);

    const result = await papersignal.addReaction(
      conversation.papersignalRoomId,
      messageId,
      {
        userId,
        userName: userInfo?.displayName || 'User',
        emoji
      }
    );

    // Emit via socket
    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${conversationId}`).emit('reaction_added', {
        conversationId,
        messageId,
        userId,
        userName: userInfo?.displayName,
        emoji
      });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({ success: false, message: 'Failed to add reaction' });
  }
};

// Remove reaction from message
exports.removeReaction = async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.userId;

    if (!emoji) {
      return res.status(400).json({ success: false, message: 'Emoji is required' });
    }

    const conversation = await Conversation.findByPk(conversationId);
    if (!conversation || !conversation.papersignalRoomId) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const result = await papersignal.removeReaction(
      conversation.papersignalRoomId,
      messageId,
      userId,
      emoji
    );

    // Emit via socket
    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${conversationId}`).emit('reaction_removed', {
        conversationId,
        messageId,
        userId,
        emoji
      });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Remove reaction error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove reaction' });
  }
};

// Edit message
exports.editMessage = async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    const { content } = req.body;
    const userId = req.userId;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Content is required' });
    }

    const conversation = await Conversation.findByPk(conversationId);
    if (!conversation || !conversation.papersignalRoomId) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const result = await papersignal.editMessage(
      conversation.papersignalRoomId,
      messageId,
      userId,
      content.trim()
    );

    // Emit via socket
    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${conversationId}`).emit('message_edited', {
        conversationId,
        messageId,
        content: content.trim(),
        editedAt: new Date()
      });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ success: false, message: 'Failed to edit message' });
  }
};

// Delete message
exports.deleteMessage = async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    const userId = req.userId;

    const conversation = await Conversation.findByPk(conversationId);
    if (!conversation || !conversation.papersignalRoomId) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const result = await papersignal.deleteMessage(
      conversation.papersignalRoomId,
      messageId,
      userId
    );

    // Emit via socket
    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${conversationId}`).emit('message_deleted', {
        conversationId,
        messageId,
        deletedAt: new Date()
      });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete message' });
  }
};

// Send typing indicator
exports.sendTyping = async (req, res) => {
  try {
    const conversationId = req.params.id;
    const userId = req.userId;

    const userInfo = await getUserDisplayInfo(userId);

    // Emit via socket
    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${conversationId}`).emit('user_typing', {
        conversationId,
        userId,
        userName: userInfo?.displayName || 'User'
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Send typing error:', error);
    res.status(500).json({ success: false, message: 'Failed to send typing indicator' });
  }
};

// Get user presence
exports.getPresence = async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await papersignal.getPresence(userId);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Get presence error:', error);
    res.status(500).json({ success: false, message: 'Failed to get presence' });
  }
};

// Get bulk presence
exports.getBulkPresence = async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ success: false, message: 'userIds array is required' });
    }

    const result = await papersignal.getBulkPresence(userIds);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Get bulk presence error:', error);
    res.status(500).json({ success: false, message: 'Failed to get presence' });
  }
};

// Upload attachment (now handled via Papersignal's file handling or keep local)
exports.uploadAttachment = async (req, res) => {
  try {
    // For now, we can use Cloudinary for file uploads and send the URL in message metadata
    res.status(501).json({ success: false, message: 'Use Cloudinary upload and include URL in message' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to upload' });
  }
};

// Get contacts - active collaborations that can be messaged
exports.getContacts = async (req, res) => {
  try {
    const userId = req.userId;
    const userInfo = await getUserDisplayInfo(userId);

    if (!userInfo) {
      return res.status(400).json({ success: false, message: 'User profile not found' });
    }

    // Get active collaboration requests based on user type
    let contacts = [];

    if (userInfo.entityType === 'creator') {
      // Creator sees brands they have active collaborations with
      const requests = await CollaborationRequest.findAll({
        where: {
          creatorId: userInfo.entityId,
          status: ['accepted', 'in_progress', 'content_submitted', 'revision_requested']
        },
        include: [
          {
            model: Brand,
            as: 'brand',
            attributes: ['id', 'companyName', 'logo', 'industry'],
            include: [{ model: User, as: 'user', attributes: ['id'] }]
          }
        ],
        order: [['updatedAt', 'DESC']]
      });

      // Group by brand (in case of multiple requests with same brand)
      const brandMap = new Map();
      for (const request of requests) {
        if (!request.brand) continue;
        const brandId = request.brand.id;
        if (!brandMap.has(brandId)) {
          brandMap.set(brandId, {
            id: request.brand.id,
            name: request.brand.companyName,
            avatar: request.brand.logo,
            userId: request.brand.user?.id,
            industry: request.brand.industry,
            type: 'brand',
            activeRequests: []
          });
        }
        brandMap.get(brandId).activeRequests.push({
          id: request.id,
          title: request.title,
          status: request.status
        });
      }
      contacts = Array.from(brandMap.values());
    } else {
      // Brand sees creators they have active collaborations with
      const requests = await CollaborationRequest.findAll({
        where: {
          brandId: userInfo.entityId,
          status: ['accepted', 'in_progress', 'content_submitted', 'revision_requested']
        },
        include: [
          {
            model: Creator,
            as: 'creator',
            attributes: ['id', 'displayName', 'profileImage', 'tier', 'primaryCategory'],
            include: [{ model: User, as: 'user', attributes: ['id'] }]
          }
        ],
        order: [['updatedAt', 'DESC']]
      });

      // Group by creator
      const creatorMap = new Map();
      for (const request of requests) {
        if (!request.creator) continue;
        const creatorId = request.creator.id;
        if (!creatorMap.has(creatorId)) {
          creatorMap.set(creatorId, {
            id: request.creator.id,
            name: request.creator.displayName,
            avatar: request.creator.profileImage,
            userId: request.creator.user?.id,
            tier: request.creator.tier,
            category: request.creator.primaryCategory,
            type: 'creator',
            activeRequests: []
          });
        }
        creatorMap.get(creatorId).activeRequests.push({
          id: request.id,
          title: request.title,
          status: request.status
        });
      }
      contacts = Array.from(creatorMap.values());
    }

    res.json({ success: true, data: contacts });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ success: false, message: 'Failed to get contacts' });
  }
};
