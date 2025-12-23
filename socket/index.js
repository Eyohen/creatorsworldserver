const jwt = require('jsonwebtoken');
const db = require('../models');
const { User, Conversation, Message, Notification } = db;

// Store online users
const onlineUsers = new Map();

// Socket authentication middleware
const socketAuthMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.userId);

    if (!user || user.status !== 'active') {
      return next(new Error('User not found or inactive'));
    }

    socket.userId = user.id;
    socket.userType = user.userType;
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
};

// Initialize socket handlers
const initializeSocket = (io) => {
  // Apply authentication middleware
  io.use(socketAuthMiddleware);

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    console.log(`User connected: ${userId}`);

    // Add user to online users
    onlineUsers.set(userId, socket.id);

    // Join user's personal room for notifications
    socket.join(`user:${userId}`);

    // Emit online status to relevant users
    socket.broadcast.emit('user_online', { userId });

    // Handle joining conversation rooms
    socket.on('join_conversation', async (conversationId) => {
      try {
        // Verify user is part of conversation
        const conversation = await Conversation.findByPk(conversationId);
        if (!conversation) {
          return socket.emit('error', { message: 'Conversation not found' });
        }

        // Check if user is participant
        if (conversation.creatorId !== userId && conversation.brandId !== userId) {
          return socket.emit('error', { message: 'Not authorized for this conversation' });
        }

        socket.join(`conversation:${conversationId}`);
        socket.emit('joined_conversation', { conversationId });
      } catch (error) {
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });

    // Handle leaving conversation rooms
    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    // Handle new message
    socket.on('send_message', async (data) => {
      try {
        const { conversationId, content, attachments } = data;

        // Verify user is part of conversation
        const conversation = await Conversation.findByPk(conversationId);
        if (!conversation) {
          return socket.emit('error', { message: 'Conversation not found' });
        }

        if (conversation.creatorId !== userId && conversation.brandId !== userId) {
          return socket.emit('error', { message: 'Not authorized' });
        }

        // Create message
        const message = await Message.create({
          conversationId,
          senderId: userId,
          content,
          attachments: attachments || null,
          isRead: false
        });

        // Update conversation
        await conversation.update({
          lastMessageId: message.id,
          lastMessageAt: new Date()
        });

        // Increment unread count for other participant
        const recipientId = conversation.creatorId === userId
          ? conversation.brandId
          : conversation.creatorId;

        if (conversation.creatorId === userId) {
          await conversation.increment('brandUnreadCount');
        } else {
          await conversation.increment('creatorUnreadCount');
        }

        // Emit to conversation room
        io.to(`conversation:${conversationId}`).emit('new_message', {
          ...message.toJSON(),
          sender: { id: userId }
        });

        // Send notification to recipient if offline
        if (!onlineUsers.has(recipientId)) {
          // Create notification for offline user
          await Notification.create({
            userId: recipientId,
            type: 'new_message',
            title: 'New Message',
            message: `You have a new message`,
            data: { conversationId, messageId: message.id },
            isRead: false
          });
        } else {
          // Emit to recipient's personal room
          io.to(`user:${recipientId}`).emit('message_received', {
            conversationId,
            message: message.toJSON()
          });
        }
      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicator
    socket.on('typing_start', (data) => {
      const { conversationId } = data;
      socket.to(`conversation:${conversationId}`).emit('user_typing', {
        userId,
        conversationId
      });
    });

    socket.on('typing_stop', (data) => {
      const { conversationId } = data;
      socket.to(`conversation:${conversationId}`).emit('user_stopped_typing', {
        userId,
        conversationId
      });
    });

    // Handle message read
    socket.on('mark_read', async (data) => {
      try {
        const { conversationId, messageIds } = data;

        // Update messages as read
        await Message.update(
          { isRead: true, readAt: new Date() },
          { where: { id: messageIds, conversationId } }
        );

        // Reset unread count
        const conversation = await Conversation.findByPk(conversationId);
        if (conversation) {
          if (conversation.creatorId === userId) {
            await conversation.update({ creatorUnreadCount: 0 });
          } else {
            await conversation.update({ brandUnreadCount: 0 });
          }
        }

        // Notify sender that messages were read
        socket.to(`conversation:${conversationId}`).emit('messages_read', {
          conversationId,
          messageIds,
          readBy: userId
        });
      } catch (error) {
        socket.emit('error', { message: 'Failed to mark messages as read' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${userId}`);
      onlineUsers.delete(userId);
      socket.broadcast.emit('user_offline', { userId });
    });
  });

  // Helper function to emit to specific user
  io.emitToUser = (userId, event, data) => {
    io.to(`user:${userId}`).emit(event, data);
  };

  // Helper function to emit notification
  io.sendNotification = async (userId, notification) => {
    // Save to database
    const saved = await Notification.create({
      userId,
      ...notification,
      isRead: false
    });

    // Emit to user
    io.to(`user:${userId}`).emit('notification', saved.toJSON());

    return saved;
  };

  return io;
};

module.exports = initializeSocket;
