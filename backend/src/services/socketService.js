/**
 * Socket.io Service - Real-time Mesajlaşma
 * Visitor (web widget) ve Operator (mobil app) iletişimini yönetir
 */

const { v4: uuidv4 } = require('uuid');
const config = require('../config');

class SocketService {
  constructor() {
    this.io = null;
    
    // Bellekte tutulan veriler (production'da Redis kullanılmalı)
    this.conversations = new Map();  // chatId -> conversation data
    this.visitors = new Map();       // visitorId -> socket info
    this.operators = new Map();      // operatorId -> socket info
    this.socketToUser = new Map();   // socketId -> user info
  }

  /**
   * Socket.io'yu başlat
   */
  initialize(io) {
    this.io = io;

    io.on('connection', (socket) => {
      console.log(`🔌 Yeni bağlantı: ${socket.id}`);

      // Bağlantı türünü belirle
      socket.on('register', (data) => this.handleRegister(socket, data));
      
      // Mesaj olayları
      socket.on('message:send', (data) => this.handleSendMessage(socket, data));
      socket.on('message:typing', (data) => this.handleTyping(socket, data));
      socket.on('message:read', (data) => this.handleMessageRead(socket, data));
      
      // Sohbet olayları
      socket.on('chat:accept', (data) => this.handleChatAccept(socket, data));
      socket.on('chat:close', (data) => this.handleChatClose(socket, data));
      socket.on('chat:transfer', (data) => this.handleChatTransfer(socket, data));
      
      // Operatör durumu
      socket.on('operator:status', (data) => this.handleOperatorStatus(socket, data));
      
      // Bağlantı kopması
      socket.on('disconnect', () => this.handleDisconnect(socket));
    });

    console.log('✅ Socket.io servisi başlatıldı');
  }

  /**
   * Kullanıcı kaydı (visitor veya operator)
   */
  handleRegister(socket, data) {
    const { type, userId, userData } = data;

    if (type === 'visitor') {
      this.registerVisitor(socket, userId, userData);
    } else if (type === 'operator') {
      this.registerOperator(socket, userId, userData);
    }
  }

  /**
   * Ziyaretçi kaydı
   */
  registerVisitor(socket, visitorId, userData) {
    const id = visitorId || uuidv4();
    
    // Mevcut sohbet var mı kontrol et
    let conversation = this.findVisitorConversation(id);
    
    if (!conversation) {
      // Yeni sohbet oluştur
      const chatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      conversation = {
        chatId,
        visitorId: id,
        visitor: {
          id,
          name: userData?.name || 'Ziyaretçi',
          ...userData
        },
        operator: null,
        status: 'pending',
        messages: [],
        createdAt: new Date(),
        lastActivity: new Date()
      };
      this.conversations.set(chatId, conversation);
    }

    // Socket bilgilerini kaydet
    this.visitors.set(id, {
      socketId: socket.id,
      visitorId: id,
      chatId: conversation.chatId,
      connectedAt: new Date()
    });
    
    this.socketToUser.set(socket.id, { type: 'visitor', id, chatId: conversation.chatId });
    
    // Visitor'ı kendi odasına ekle
    socket.join(`visitor:${id}`);
    socket.join(`chat:${conversation.chatId}`);

    // Visitor'a sohbet bilgisini gönder
    socket.emit('registered', {
      success: true,
      visitorId: id,
      chatId: conversation.chatId,
      conversation: this.sanitizeConversation(conversation)
    });

    // Tüm operatörlere yeni sohbet bildirimi gönder
    if (conversation.status === 'pending') {
      this.io.to('operators').emit('chat:new', {
        chatId: conversation.chatId,
        visitor: conversation.visitor,
        createdAt: conversation.createdAt
      });
    }

    console.log(`👤 Ziyaretçi kayıt: ${id} - Chat: ${conversation.chatId}`);
  }

  /**
   * Operatör kaydı
   */
  registerOperator(socket, operatorId, userData) {
    // Operatör bilgilerini kaydet
    this.operators.set(operatorId, {
      socketId: socket.id,
      operatorId,
      userData,
      status: 'available',
      activeChats: [],
      connectedAt: new Date()
    });
    
    this.socketToUser.set(socket.id, { type: 'operator', id: operatorId });
    
    // Operatör odasına ekle
    socket.join('operators');
    socket.join(`operator:${operatorId}`);

    // Bekleyen sohbetleri gönder
    const pendingChats = this.getPendingChats();
    const activeChats = this.getOperatorChats(operatorId);

    socket.emit('registered', {
      success: true,
      operatorId,
      pendingChats,
      activeChats,
      onlineOperators: this.getOnlineOperators()
    });

    // Diğer operatörlere bildir
    socket.to('operators').emit('operator:online', {
      operatorId,
      userData
    });

    console.log(`👨‍💼 Operatör kayıt: ${operatorId}`);
  }

  /**
   * Mesaj gönderme
   */
  handleSendMessage(socket, data) {
    const { chatId, content, type = 'text', replyTo = null } = data;
    const userInfo = this.socketToUser.get(socket.id);
    
    if (!userInfo || !chatId) {
      socket.emit('error', { message: 'Geçersiz istek' });
      return;
    }

    const conversation = this.conversations.get(chatId);
    if (!conversation) {
      socket.emit('error', { message: 'Sohbet bulunamadı' });
      return;
    }

    // Mesaj oluştur
    const message = {
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      chatId,
      sender: {
        type: userInfo.type,
        id: userInfo.id,
        name: userInfo.type === 'visitor' 
          ? conversation.visitor.name 
          : this.operators.get(userInfo.id)?.userData?.name || 'Operatör'
      },
      content: {
        type,
        text: content
      },
      status: 'sent',
      replyTo,
      createdAt: new Date()
    };

    // Mesajı kaydet
    conversation.messages.push(message);
    conversation.lastActivity = new Date();
    conversation.lastMessage = {
      content: content.substring(0, 100),
      sender: userInfo.type,
      timestamp: new Date()
    };

    // Gönderene onay
    socket.emit('message:sent', {
      messageId: message.messageId,
      status: 'sent',
      timestamp: message.createdAt
    });

    // Karşı tarafa mesajı ilet
    socket.to(`chat:${chatId}`).emit('message:receive', message);

    // Operatörlere güncelleme
    if (userInfo.type === 'visitor' && conversation.status === 'pending') {
      this.io.to('operators').emit('chat:update', {
        chatId,
        lastMessage: conversation.lastMessage
      });
    }

    console.log(`💬 Mesaj: ${userInfo.type}:${userInfo.id} -> ${chatId}`);
  }

  /**
   * Yazıyor bildirimi
   */
  handleTyping(socket, data) {
    const { chatId, isTyping } = data;
    const userInfo = this.socketToUser.get(socket.id);
    
    if (!userInfo || !chatId) return;

    socket.to(`chat:${chatId}`).emit('typing', {
      chatId,
      userId: userInfo.id,
      userType: userInfo.type,
      isTyping
    });
  }

  /**
   * Mesaj okundu bildirimi
   */
  handleMessageRead(socket, data) {
    const { chatId, messageIds } = data;
    const userInfo = this.socketToUser.get(socket.id);
    
    if (!userInfo || !chatId) return;

    const conversation = this.conversations.get(chatId);
    if (!conversation) return;

    // Mesajları okundu olarak işaretle
    messageIds.forEach(msgId => {
      const message = conversation.messages.find(m => m.messageId === msgId);
      if (message && message.sender.id !== userInfo.id) {
        message.status = 'read';
        message.readAt = new Date();
      }
    });

    // Karşı tarafa bildir
    socket.to(`chat:${chatId}`).emit('message:status', {
      chatId,
      messageIds,
      status: 'read',
      readAt: new Date()
    });
  }

  /**
   * Operatör sohbeti kabul etti
   */
  handleChatAccept(socket, data) {
    const { chatId } = data;
    const userInfo = this.socketToUser.get(socket.id);
    
    if (!userInfo || userInfo.type !== 'operator') {
      socket.emit('error', { message: 'Yetkiniz yok' });
      return;
    }

    const conversation = this.conversations.get(chatId);
    if (!conversation) {
      socket.emit('error', { message: 'Sohbet bulunamadı' });
      return;
    }

    if (conversation.status !== 'pending') {
      socket.emit('error', { message: 'Bu sohbet zaten atanmış' });
      return;
    }

    // Operatörü ata
    const operator = this.operators.get(userInfo.id);
    conversation.operator = {
      id: userInfo.id,
      name: operator?.userData?.name || 'Operatör'
    };
    conversation.status = 'active';
    conversation.acceptedAt = new Date();

    // Operatörü sohbet odasına ekle
    socket.join(`chat:${chatId}`);

    // Operatör aktif chat listesini güncelle
    if (operator) {
      operator.activeChats.push(chatId);
    }

    // Sistem mesajı ekle
    const systemMessage = {
      messageId: `msg_${Date.now()}_sys`,
      chatId,
      sender: { type: 'system', id: 'system', name: 'Sistem' },
      content: {
        type: 'text',
        text: `${conversation.operator.name} sohbete katıldı.`
      },
      status: 'sent',
      createdAt: new Date()
    };
    conversation.messages.push(systemMessage);

    // Ziyaretçiye bildir
    this.io.to(`chat:${chatId}`).emit('chat:accepted', {
      chatId,
      operator: conversation.operator,
      systemMessage
    });

    // Diğer operatörlere bildir
    this.io.to('operators').emit('chat:assigned', {
      chatId,
      operatorId: userInfo.id
    });

    // Kabul eden operatöre sohbet detaylarını gönder
    socket.emit('chat:joined', {
      chatId,
      conversation: this.sanitizeConversation(conversation)
    });

    console.log(`✅ Sohbet kabul edildi: ${chatId} -> Operatör: ${userInfo.id}`);
  }

  /**
   * Sohbeti kapat
   */
  handleChatClose(socket, data) {
    const { chatId, reason } = data;
    const userInfo = this.socketToUser.get(socket.id);
    
    if (!userInfo) return;

    const conversation = this.conversations.get(chatId);
    if (!conversation) return;

    conversation.status = 'closed';
    conversation.closedAt = new Date();
    conversation.closeReason = reason;

    // Sistem mesajı
    const systemMessage = {
      messageId: `msg_${Date.now()}_sys`,
      chatId,
      sender: { type: 'system', id: 'system', name: 'Sistem' },
      content: {
        type: 'text',
        text: 'Sohbet sonlandırıldı.'
      },
      status: 'sent',
      createdAt: new Date()
    };
    conversation.messages.push(systemMessage);

    // Herkese bildir
    this.io.to(`chat:${chatId}`).emit('chat:closed', {
      chatId,
      closedBy: userInfo.type,
      systemMessage
    });

    console.log(`🔒 Sohbet kapatıldı: ${chatId}`);
  }

  /**
   * Sohbeti transfer et
   */
  handleChatTransfer(socket, data) {
    const { chatId, targetOperatorId } = data;
    const userInfo = this.socketToUser.get(socket.id);
    
    if (!userInfo || userInfo.type !== 'operator') {
      socket.emit('error', { message: 'Yetkiniz yok' });
      return;
    }

    const conversation = this.conversations.get(chatId);
    if (!conversation) return;

    const targetOperator = this.operators.get(targetOperatorId);
    if (!targetOperator) {
      socket.emit('error', { message: 'Hedef operatör çevrimiçi değil' });
      return;
    }

    // Transfer işlemi
    const oldOperator = conversation.operator;
    conversation.operator = {
      id: targetOperatorId,
      name: targetOperator.userData?.name || 'Operatör'
    };

    // Sistem mesajı
    const systemMessage = {
      messageId: `msg_${Date.now()}_sys`,
      chatId,
      sender: { type: 'system', id: 'system', name: 'Sistem' },
      content: {
        type: 'text',
        text: `Sohbet ${conversation.operator.name} kişisine transfer edildi.`
      },
      status: 'sent',
      createdAt: new Date()
    };
    conversation.messages.push(systemMessage);

    // Hedef operatörü sohbet odasına ekle
    const targetSocket = this.io.sockets.sockets.get(targetOperator.socketId);
    if (targetSocket) {
      targetSocket.join(`chat:${chatId}`);
    }

    // Bildir
    this.io.to(`chat:${chatId}`).emit('chat:transferred', {
      chatId,
      fromOperator: oldOperator,
      toOperator: conversation.operator,
      systemMessage
    });

    console.log(`🔄 Sohbet transfer: ${chatId} -> ${targetOperatorId}`);
  }

  /**
   * Operatör durumu değiştirme
   */
  handleOperatorStatus(socket, data) {
    const { status } = data;
    const userInfo = this.socketToUser.get(socket.id);
    
    if (!userInfo || userInfo.type !== 'operator') return;

    const operator = this.operators.get(userInfo.id);
    if (operator) {
      operator.status = status;
      
      this.io.to('operators').emit('operator:statusChange', {
        operatorId: userInfo.id,
        status
      });
    }
  }

  /**
   * Bağlantı kopması
   */
  handleDisconnect(socket) {
    const userInfo = this.socketToUser.get(socket.id);
    
    if (!userInfo) return;

    if (userInfo.type === 'visitor') {
      const visitor = this.visitors.get(userInfo.id);
      if (visitor) {
        // 30 saniye bekle, tekrar bağlanmazsa offline say
        setTimeout(() => {
          const currentVisitor = this.visitors.get(userInfo.id);
          if (currentVisitor?.socketId === socket.id) {
            this.visitors.delete(userInfo.id);
            
            // Operatörlere bildir
            if (userInfo.chatId) {
              this.io.to(`chat:${userInfo.chatId}`).emit('visitor:offline', {
                visitorId: userInfo.id,
                chatId: userInfo.chatId
              });
            }
          }
        }, 30000);
      }
      console.log(`👤 Ziyaretçi ayrıldı: ${userInfo.id}`);
      
    } else if (userInfo.type === 'operator') {
      this.operators.delete(userInfo.id);
      
      // Diğer operatörlere bildir
      this.io.to('operators').emit('operator:offline', {
        operatorId: userInfo.id
      });
      
      console.log(`👨‍💼 Operatör ayrıldı: ${userInfo.id}`);
    }

    this.socketToUser.delete(socket.id);
  }

  // ============ Yardımcı Metodlar ============

  findVisitorConversation(visitorId) {
    for (const [chatId, conv] of this.conversations) {
      if (conv.visitorId === visitorId && conv.status !== 'closed') {
        return conv;
      }
    }
    return null;
  }

  getPendingChats() {
    const pending = [];
    for (const [chatId, conv] of this.conversations) {
      if (conv.status === 'pending') {
        pending.push(this.sanitizeConversation(conv));
      }
    }
    return pending.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  getOperatorChats(operatorId) {
    const chats = [];
    for (const [chatId, conv] of this.conversations) {
      if (conv.operator?.id === operatorId && conv.status === 'active') {
        chats.push(this.sanitizeConversation(conv));
      }
    }
    return chats.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
  }

  getOnlineOperators() {
    const operators = [];
    for (const [id, op] of this.operators) {
      operators.push({
        id,
        name: op.userData?.name,
        avatar: op.userData?.avatar,
        status: op.status,
        activeChatsCount: op.activeChats.length
      });
    }
    return operators;
  }

  sanitizeConversation(conv) {
    return {
      chatId: conv.chatId,
      visitor: conv.visitor,
      operator: conv.operator,
      status: conv.status,
      lastMessage: conv.lastMessage,
      messages: conv.messages.slice(-50), // Son 50 mesaj
      createdAt: conv.createdAt,
      lastActivity: conv.lastActivity
    };
  }

  // Dışarıdan erişim için
  getIO() {
    return this.io;
  }

  getConversation(chatId) {
    return this.conversations.get(chatId);
  }

  getStats() {
    return {
      totalConversations: this.conversations.size,
      pendingChats: this.getPendingChats().length,
      onlineVisitors: this.visitors.size,
      onlineOperators: this.operators.size
    };
  }
}

// Singleton instance
module.exports = new SocketService();
