/**
 * LiveChat Pro - Configuration Module
 * Tüm uygulama ayarları merkezi olarak burada yönetilir
 */

require('dotenv').config();

module.exports = {
  // Sunucu Ayarları
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
    apiVersion: 'v1'
  },

  // Veritabanı Ayarları (MongoDB)
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/livechat_pro',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  },

  // JWT Ayarları
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
  },

  // Socket.io Ayarları
  socket: {
    pingTimeout: 60000,
    pingInterval: 25000,
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
      credentials: true
    }
  },

  // Dosya Yükleme Ayarları
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'],
    destination: './uploads'
  },

  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 dakika
    max: 100 // maksimum istek sayısı
  },

  // Firebase Push Notification (ileride aktif edilecek)
  firebase: {
    enabled: process.env.FIREBASE_ENABLED === 'true',
    serviceAccount: process.env.FIREBASE_SERVICE_ACCOUNT
  },

  // Logging Ayarları
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined'
  },

  // Chat Ayarları
  chat: {
    maxMessageLength: 5000,
    typingTimeout: 3000, // 3 saniye
    historyLimit: 100, // son 100 mesaj
    offlineMessageEnabled: true
  },

  // Operatör Ayarları
  operator: {
    maxConcurrentChats: 10,
    autoAssign: true,
    defaultStatus: 'available'
  }
};
