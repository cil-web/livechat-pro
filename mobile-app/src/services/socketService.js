/**
 * Socket Service - Socket.io bağlantı yönetimi
 */

import { io } from 'socket.io-client';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';

class SocketService {
  constructor() {
    this.socket = null;
    this.serverUrl = 'http://localhost:3000'; // Production'da değiştirilecek
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
  }

  /**
   * Socket bağlantısını başlat
   */
  connect() {
    if (this.socket?.connected) {
      console.log('Socket zaten bağlı');
      return;
    }

    const operator = useAuthStore.getState().operator;
    if (!operator) {
      console.log('Operatör bilgisi yok, bağlantı kurulamıyor');
      return;
    }

    console.log('🔌 Socket bağlantısı kuruluyor...');

    this.socket = io(this.serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    this.setupEventListeners();
    this.registerAsOperator(operator);
  }

  /**
   * Event listener'ları kur
   */
  setupEventListeners() {
    const chatStore = useChatStore.getState();

    // Bağlantı olayları
    this.socket.on('connect', () => {
      console.log('✅ Socket bağlandı');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket bağlantısı kesildi:', reason);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.log('⚠️ Bağlantı hatası:', error.message);
      this.reconnectAttempts++;
    });

    // Kayıt sonucu
    this.socket.on('registered', (data) => {
      if (data.success) {
        console.log('📝 Operatör kaydı başarılı');
        chatStore.setPendingChats(data.pendingChats || []);
        chatStore.setActiveChats(data.activeChats || []);
        chatStore.setOnlineOperators(data.onlineOperators || []);
      }
    });

    // Yeni sohbet
    this.socket.on('chat:new', (data) => {
      console.log('📩 Yeni sohbet:', data.chatId);
      chatStore.addPendingChat(data);
      this.playNotificationSound();
    });

    // Sohbet güncelleme
    this.socket.on('chat:update', (data) => {
      // Pending chat'lerde son mesajı güncelle
    });

    // Sohbet atandı (başka operatöre)
    this.socket.on('chat:assigned', (data) => {
      chatStore.removePendingChat(data.chatId);
    });

    // Sohbete katıldık
    this.socket.on('chat:joined', (data) => {
      console.log('✅ Sohbete katıldık:', data.chatId);
      chatStore.acceptChat(data.chatId, data.conversation);
      chatStore.setMessages(data.chatId, data.conversation.messages || []);
    });

    // Mesaj alındı
    this.socket.on('message:receive', (message) => {
      console.log('💬 Mesaj alındı:', message.messageId);
      chatStore.addMessage(message.chatId, message);
      
      const currentChat = useChatStore.getState().currentChat;
      if (currentChat?.chatId !== message.chatId) {
        chatStore.incrementUnread(message.chatId);
        this.playNotificationSound();
      }
    });

    // Mesaj gönderildi onayı
    this.socket.on('message:sent', (data) => {
      chatStore.updateMessageStatus(data.chatId, data.messageId, 'sent');
    });

    // Mesaj durumu güncellendi
    this.socket.on('message:status', (data) => {
      data.messageIds.forEach((msgId) => {
        chatStore.updateMessageStatus(data.chatId, msgId, data.status);
      });
    });

    // Yazıyor bildirimi
    this.socket.on('typing', (data) => {
      chatStore.setTyping(data.chatId, data.isTyping, data.userType);
    });

    // Ziyaretçi offline
    this.socket.on('visitor:offline', (data) => {
      console.log('👤 Ziyaretçi offline:', data.visitorId);
    });

    // Sohbet kapatıldı
    this.socket.on('chat:closed', (data) => {
      console.log('🔒 Sohbet kapatıldı:', data.chatId);
      chatStore.closeChat(data.chatId);
    });

    // Operatör durumu
    this.socket.on('operator:online', (data) => {
      chatStore.addOnlineOperator(data);
    });

    this.socket.on('operator:offline', (data) => {
      chatStore.removeOnlineOperator(data.operatorId);
    });

    this.socket.on('operator:statusChange', (data) => {
      // Operatör durumu güncelle
    });
  }

  /**
   * Operatör olarak kayıt ol
   */
  registerAsOperator(operator) {
    if (!this.socket) return;

    this.socket.emit('register', {
      type: 'operator',
      userId: operator.id,
      userData: {
        name: operator.name,
        email: operator.email,
        avatar: operator.avatar,
      },
    });
  }

  /**
   * Sohbeti kabul et
   */
  acceptChat(chatId) {
    if (!this.socket) return;
    this.socket.emit('chat:accept', { chatId });
  }

  /**
   * Mesaj gönder
   */
  sendMessage(chatId, content, type = 'text') {
    if (!this.socket) return;

    const tempId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const operator = useAuthStore.getState().operator;

    // Önce local'e ekle
    const message = {
      messageId: tempId,
      chatId,
      sender: {
        type: 'operator',
        id: operator.id,
        name: operator.name,
      },
      content: { type, text: content },
      status: 'sending',
      createdAt: new Date().toISOString(),
    };

    useChatStore.getState().addMessage(chatId, message);

    // Socket'e gönder
    this.socket.emit('message:send', {
      chatId,
      content,
      type,
    });
  }

  /**
   * Typing durumu gönder
   */
  sendTyping(chatId, isTyping) {
    if (!this.socket) return;
    this.socket.emit('message:typing', { chatId, isTyping });
  }

  /**
   * Mesajları okundu olarak işaretle
   */
  markAsRead(chatId, messageIds) {
    if (!this.socket || messageIds.length === 0) return;
    this.socket.emit('message:read', { chatId, messageIds });
  }

  /**
   * Sohbeti kapat
   */
  closeChat(chatId, reason = '') {
    if (!this.socket) return;
    this.socket.emit('chat:close', { chatId, reason });
  }

  /**
   * Sohbeti transfer et
   */
  transferChat(chatId, targetOperatorId) {
    if (!this.socket) return;
    this.socket.emit('chat:transfer', { chatId, targetOperatorId });
  }

  /**
   * Operatör durumunu değiştir
   */
  setStatus(status) {
    if (!this.socket) return;
    this.socket.emit('operator:status', { status });
  }

  /**
   * Bildirim sesi çal
   */
  playNotificationSound() {
    // Expo Audio ile ses çalınabilir
    // Audio.Sound.createAsync(require('../assets/notification.mp3'))
    //   .then(({ sound }) => sound.playAsync());
  }

  /**
   * Bağlantıyı kapat
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * Server URL'ini değiştir
   */
  setServerUrl(url) {
    this.serverUrl = url;
  }
}

// Singleton instance
export const socketService = new SocketService();
export default socketService;
