/**
 * LiveChat Pro - Web Widget
 * Herhangi bir web sitesine embed edilebilir chat widget'ı
 * 
 * Kullanım:
 * <script src="https://your-server.com/widget/widget.js" data-server="https://your-server.com"></script>
 */

(function() {
  'use strict';

  // Konfigürasyon
  const CONFIG = {
    serverUrl: document.currentScript?.getAttribute('data-server') || 'http://localhost:3000',
    position: document.currentScript?.getAttribute('data-position') || 'right',
    primaryColor: document.currentScript?.getAttribute('data-color') || '#4F46E5',
    companyName: document.currentScript?.getAttribute('data-company') || 'Canlı Destek',
    welcomeMessage: document.currentScript?.getAttribute('data-welcome') || 'Merhaba! 👋 Size nasıl yardımcı olabilirim?'
  };

  // State
  let socket = null;
  let visitorId = null;
  let chatId = null;
  let isConnected = false;
  let isTyping = false;
  let typingTimeout = null;
  let unreadCount = 0;

  // DOM Elements
  let container, toggleBtn, chatWindow, messagesContainer, inputField, sendBtn;

  /**
   * Widget'ı başlat
   */
  function init() {
    // Mevcut visitor ID'yi al veya yeni oluştur
    visitorId = localStorage.getItem('lcp_visitor_id') || generateId();
    localStorage.setItem('lcp_visitor_id', visitorId);

    // CSS'i yükle
    loadStyles();

    // Widget HTML'i oluştur
    createWidget();

    // Socket bağlantısı kur
    loadSocket().then(() => {
      connectSocket();
    });

    console.log('🚀 LiveChat Pro Widget başlatıldı');
  }

  /**
   * CSS'i yükle
   */
  function loadStyles() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${CONFIG.serverUrl}/widget/widget.css`;
    document.head.appendChild(link);

    // Custom color override
    if (CONFIG.primaryColor !== '#4F46E5') {
      const style = document.createElement('style');
      style.textContent = `
        :root {
          --lcp-primary: ${CONFIG.primaryColor};
          --lcp-primary-dark: ${adjustColor(CONFIG.primaryColor, -20)};
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * Widget HTML yapısını oluştur
   */
  function createWidget() {
    container = document.createElement('div');
    container.id = 'livechat-pro-widget';
    if (CONFIG.position === 'left') {
      container.style.left = '20px';
      container.style.right = 'auto';
    }

    container.innerHTML = `
      <!-- Toggle Button -->
      <button class="lcp-toggle-btn" aria-label="Chat aç/kapat">
        <svg class="chat-icon" viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
        </svg>
        <svg class="close-icon" viewBox="0 0 24 24">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
        <span class="lcp-unread-badge" style="display: none;">0</span>
      </button>

      <!-- Chat Window -->
      <div class="lcp-chat-window">
        <!-- Header -->
        <div class="lcp-header">
          <div class="lcp-header-avatar">
            <svg viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
            </svg>
          </div>
          <div class="lcp-header-info">
            <div class="lcp-header-title">${CONFIG.companyName}</div>
            <div class="lcp-header-status">
              <span class="lcp-status-dot"></span>
              <span class="lcp-status-text">Çevrimiçi</span>
            </div>
          </div>
          <button class="lcp-header-close" aria-label="Kapat">
            <svg viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <!-- Connection Status -->
        <div class="lcp-connection-status"></div>

        <!-- Pre-chat Form -->
        <div class="lcp-prechat active">
          <h3>Sohbete Başla</h3>
          <p>Sorunuz veya mesajınız için bilgilerinizi giriniz.</p>
          <div class="lcp-form-group">
            <label for="lcp-name">İsminiz</label>
            <input type="text" id="lcp-name" placeholder="İsminizi girin">
          </div>
          <div class="lcp-form-group">
            <label for="lcp-email">E-posta (opsiyonel)</label>
            <input type="email" id="lcp-email" placeholder="ornek@mail.com">
          </div>
          <button class="lcp-start-btn">Sohbete Başla</button>
        </div>

        <!-- Messages -->
        <div class="lcp-messages" style="display: none;">
          <!-- Typing indicator -->
          <div class="lcp-typing">
            <div class="lcp-typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span>yazıyor...</span>
          </div>
        </div>

        <!-- Input Area -->
        <div class="lcp-input-area" style="display: none;">
          <div class="lcp-input-wrapper">
            <textarea class="lcp-input" placeholder="Mesajınızı yazın..." rows="1"></textarea>
            <button class="lcp-attach-btn" aria-label="Dosya ekle">
              <svg viewBox="0 0 24 24">
                <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/>
              </svg>
            </button>
          </div>
          <button class="lcp-send-btn" aria-label="Gönder" disabled>
            <svg viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>

        <!-- Powered By -->
        <div class="lcp-powered">
          Powered by <a href="#" target="_blank">LiveChat Pro</a>
        </div>
      </div>
    `;

    document.body.appendChild(container);

    // Element referanslarını al
    toggleBtn = container.querySelector('.lcp-toggle-btn');
    chatWindow = container.querySelector('.lcp-chat-window');
    messagesContainer = container.querySelector('.lcp-messages');
    inputField = container.querySelector('.lcp-input');
    sendBtn = container.querySelector('.lcp-send-btn');

    // Event listener'ları ekle
    setupEventListeners();
  }

  /**
   * Event listener'ları kur
   */
  function setupEventListeners() {
    // Toggle button
    toggleBtn.addEventListener('click', toggleChat);
    container.querySelector('.lcp-header-close').addEventListener('click', toggleChat);

    // Pre-chat form
    container.querySelector('.lcp-start-btn').addEventListener('click', startChat);

    // Input
    inputField.addEventListener('input', handleInput);
    inputField.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Send button
    sendBtn.addEventListener('click', sendMessage);

    // Auto-resize textarea
    inputField.addEventListener('input', autoResize);
  }

  /**
   * Socket.io'yu yükle
   */
  function loadSocket() {
    return new Promise((resolve, reject) => {
      if (window.io) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `${CONFIG.serverUrl}/socket.io/socket.io.js`;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * Socket bağlantısı kur
   */
  function connectSocket() {
    socket = io(CONFIG.serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    // Bağlantı olayları
    socket.on('connect', () => {
      console.log('✅ Sunucuya bağlandı');
      isConnected = true;
      updateConnectionStatus('connected');
    });

    socket.on('disconnect', () => {
      console.log('❌ Bağlantı koptu');
      isConnected = false;
      updateConnectionStatus('disconnected');
    });

    socket.on('reconnecting', () => {
      updateConnectionStatus('reconnecting');
    });

    // Kayıt sonucu
    socket.on('registered', (data) => {
      if (data.success) {
        chatId = data.chatId;
        
        // Mevcut mesajları yükle
        if (data.conversation?.messages?.length > 0) {
          data.conversation.messages.forEach(msg => {
            if (msg.sender.type !== 'system') {
              addMessage(msg);
            }
          });
        }
        
        console.log(`📝 Kayıt başarılı. Chat ID: ${chatId}`);
      }
    });

    // Mesaj alındı
    socket.on('message:receive', (message) => {
      addMessage(message);
      playNotificationSound();
      
      if (!chatWindow.classList.contains('open')) {
        incrementUnread();
      } else {
        markAsRead([message.messageId]);
      }
    });

    // Mesaj gönderildi onayı
    socket.on('message:sent', (data) => {
      updateMessageStatus(data.messageId, 'sent');
    });

    // Mesaj durumu güncellendi
    socket.on('message:status', (data) => {
      data.messageIds.forEach(id => {
        updateMessageStatus(id, data.status);
      });
    });

    // Yazıyor bildirimi
    socket.on('typing', (data) => {
      if (data.userType === 'operator') {
        showTypingIndicator(data.isTyping);
      }
    });

    // Sohbet kabul edildi
    socket.on('chat:accepted', (data) => {
      addSystemMessage(`${data.operator.name} sohbete katıldı.`);
      updateOperatorInfo(data.operator);
    });

    // Sohbet kapatıldı
    socket.on('chat:closed', (data) => {
      addSystemMessage('Sohbet sonlandırıldı.');
    });
  }

  /**
   * Chat'i aç/kapat
   */
  function toggleChat() {
    const isOpen = chatWindow.classList.toggle('open');
    toggleBtn.classList.toggle('open', isOpen);

    if (isOpen) {
      resetUnread();
      inputField.focus();
      scrollToBottom();
    }
  }

  /**
   * Sohbeti başlat
   */
  function startChat() {
    const name = container.querySelector('#lcp-name').value.trim() || 'Ziyaretçi';
    const email = container.querySelector('#lcp-email').value.trim();

    // Pre-chat formunu gizle
    container.querySelector('.lcp-prechat').classList.remove('active');
    messagesContainer.style.display = 'flex';
    container.querySelector('.lcp-input-area').style.display = 'flex';

    // Socket'e kayıt ol
    socket.emit('register', {
      type: 'visitor',
      userId: visitorId,
      userData: {
        name,
        email,
        referrer: document.referrer,
        currentPage: window.location.href,
        userAgent: navigator.userAgent
      }
    });

    // Hoşgeldin mesajı
    setTimeout(() => {
      addMessage({
        messageId: 'welcome',
        sender: { type: 'operator', name: CONFIG.companyName },
        content: { type: 'text', text: CONFIG.welcomeMessage },
        createdAt: new Date()
      });
    }, 500);
  }

  /**
   * Mesaj gönder
   */
  function sendMessage() {
    const text = inputField.value.trim();
    if (!text || !isConnected) return;

    const tempId = `temp_${Date.now()}`;

    // Önce UI'da göster
    addMessage({
      messageId: tempId,
      sender: { type: 'visitor', id: visitorId },
      content: { type: 'text', text },
      status: 'sending',
      createdAt: new Date()
    });

    // Socket'e gönder
    socket.emit('message:send', {
      chatId,
      content: text,
      type: 'text'
    });

    // Input'u temizle
    inputField.value = '';
    sendBtn.disabled = true;
    autoResize();
    scrollToBottom();

    // Typing durduğunu bildir
    sendTypingStatus(false);
  }

  /**
   * Mesajı UI'a ekle
   */
  function addMessage(message) {
    const typingIndicator = messagesContainer.querySelector('.lcp-typing');
    
    const messageEl = document.createElement('div');
    messageEl.className = `lcp-message ${message.sender.type}`;
    messageEl.dataset.id = message.messageId;

    const time = new Date(message.createdAt).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    let statusIcon = '';
    if (message.sender.type === 'visitor') {
      statusIcon = getStatusIcon(message.status || 'sent');
    }

    messageEl.innerHTML = `
      <div class="lcp-message-content">${escapeHtml(message.content.text)}</div>
      <div class="lcp-message-meta">
        <span class="lcp-message-time">${time}</span>
        ${statusIcon ? `<span class="lcp-message-status ${message.status || ''}">${statusIcon}</span>` : ''}
      </div>
    `;

    messagesContainer.insertBefore(messageEl, typingIndicator);
    scrollToBottom();
  }

  /**
   * Sistem mesajı ekle
   */
  function addSystemMessage(text) {
    const typingIndicator = messagesContainer.querySelector('.lcp-typing');
    
    const messageEl = document.createElement('div');
    messageEl.className = 'lcp-message system';
    messageEl.innerHTML = `<div class="lcp-message-content">${escapeHtml(text)}</div>`;

    messagesContainer.insertBefore(messageEl, typingIndicator);
    scrollToBottom();
  }

  /**
   * Mesaj durumunu güncelle
   */
  function updateMessageStatus(messageId, status) {
    const messageEl = messagesContainer.querySelector(`[data-id="${messageId}"]`);
    if (messageEl) {
      const statusEl = messageEl.querySelector('.lcp-message-status');
      if (statusEl) {
        statusEl.className = `lcp-message-status ${status}`;
        statusEl.innerHTML = getStatusIcon(status);
      }
    }
  }

  /**
   * Durum ikonu
   */
  function getStatusIcon(status) {
    switch (status) {
      case 'sending':
        return '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
      case 'sent':
        return '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
      case 'delivered':
        return '<svg viewBox="0 0 24 24"><path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"/></svg>';
      case 'read':
        return '<svg viewBox="0 0 24 24"><path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"/></svg>';
      default:
        return '';
    }
  }

  /**
   * Input değişimi
   */
  function handleInput() {
    const hasText = inputField.value.trim().length > 0;
    sendBtn.disabled = !hasText;

    // Typing bildirimi
    if (hasText && !isTyping) {
      sendTypingStatus(true);
    }

    // Typing timeout
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      if (isTyping) {
        sendTypingStatus(false);
      }
    }, 2000);
  }

  /**
   * Typing durumu gönder
   */
  function sendTypingStatus(typing) {
    if (!chatId || isTyping === typing) return;
    isTyping = typing;
    socket.emit('message:typing', { chatId, isTyping: typing });
  }

  /**
   * Typing göstergesini göster/gizle
   */
  function showTypingIndicator(show) {
    const indicator = messagesContainer.querySelector('.lcp-typing');
    indicator.classList.toggle('active', show);
    if (show) scrollToBottom();
  }

  /**
   * Mesajları okundu olarak işaretle
   */
  function markAsRead(messageIds) {
    if (!chatId || messageIds.length === 0) return;
    socket.emit('message:read', { chatId, messageIds });
  }

  /**
   * Operatör bilgisini güncelle
   */
  function updateOperatorInfo(operator) {
    const avatar = container.querySelector('.lcp-header-avatar');
    const title = container.querySelector('.lcp-header-title');
    
    if (operator.avatar) {
      avatar.innerHTML = `<img src="${operator.avatar}" alt="${operator.name}">`;
    }
    title.textContent = operator.name;
  }

  /**
   * Bağlantı durumunu güncelle
   */
  function updateConnectionStatus(status) {
    const statusEl = container.querySelector('.lcp-connection-status');
    const statusDot = container.querySelector('.lcp-status-dot');
    const statusText = container.querySelector('.lcp-status-text');

    statusEl.className = 'lcp-connection-status ' + status;

    switch (status) {
      case 'connected':
        statusEl.textContent = '';
        statusDot.classList.remove('offline');
        statusText.textContent = 'Çevrimiçi';
        break;
      case 'disconnected':
        statusEl.textContent = 'Bağlantı koptu. Yeniden bağlanılıyor...';
        statusDot.classList.add('offline');
        statusText.textContent = 'Çevrimdışı';
        break;
      case 'reconnecting':
        statusEl.textContent = 'Yeniden bağlanılıyor...';
        break;
    }
  }

  /**
   * Unread badge'i artır
   */
  function incrementUnread() {
    unreadCount++;
    updateUnreadBadge();
  }

  /**
   * Unread badge'i sıfırla
   */
  function resetUnread() {
    unreadCount = 0;
    updateUnreadBadge();
  }

  /**
   * Unread badge'i güncelle
   */
  function updateUnreadBadge() {
    const badge = container.querySelector('.lcp-unread-badge');
    if (unreadCount > 0) {
      badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  /**
   * Bildirim sesi çal
   */
  function playNotificationSound() {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onp+dm4+FfHN1eYeRl5OPiIN/fn+Dh4yPkI+MiYWDgoOFh4qMjY2Mioeing');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch (e) {}
  }

  /**
   * En alta kaydır
   */
  function scrollToBottom() {
    setTimeout(() => {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 100);
  }

  /**
   * Textarea auto-resize
   */
  function autoResize() {
    inputField.style.height = 'auto';
    inputField.style.height = Math.min(inputField.scrollHeight, 100) + 'px';
  }

  // ============ Yardımcı Fonksiyonlar ============

  function generateId() {
    return 'v_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function adjustColor(color, amount) {
    const clamp = (val) => Math.min(255, Math.max(0, val));
    
    let hex = color.replace('#', '');
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    
    const num = parseInt(hex, 16);
    const r = clamp((num >> 16) + amount);
    const g = clamp(((num >> 8) & 0x00FF) + amount);
    const b = clamp((num & 0x0000FF) + amount);
    
    return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
  }

  // Sayfa yüklendiğinde başlat
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Global API (opsiyonel)
  window.LiveChatPro = {
    open: () => chatWindow?.classList.add('open'),
    close: () => chatWindow?.classList.remove('open'),
    toggle: toggleChat,
    sendMessage: (text) => {
      if (inputField) {
        inputField.value = text;
        sendMessage();
      }
    }
  };

})();
