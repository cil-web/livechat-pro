/**
 * LiveChat Pro - Main Server
 * Node.js + Express + Socket.io
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const config = require('./src/config');
const socketService = require('./src/services/socketService');

// Express uygulaması
const app = express();
const server = http.createServer(app);

// Socket.io
const io = new Server(server, {
  cors: config.socket.cors,
  pingTimeout: config.socket.pingTimeout,
  pingInterval: config.socket.pingInterval
});

// ============ Middleware ============

// Güvenlik
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: { error: 'Çok fazla istek gönderdiniz, lütfen bekleyin.' }
});
app.use('/api/', limiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Statik dosyalar
app.use('/widget', express.static(path.join(__dirname, '../web-widget')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============ API Routes ============

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API versiyon bilgisi
app.get('/api/v1', (req, res) => {
  res.json({
    name: 'LiveChat Pro API',
    version: '1.0.0',
    documentation: '/api/v1/docs'
  });
});

// İstatistikler
app.get('/api/v1/stats', (req, res) => {
  res.json(socketService.getStats());
});

// Widget konfigürasyonu
app.get('/api/v1/widget/config', (req, res) => {
  res.json({
    welcomeMessage: 'Merhaba! Size nasıl yardımcı olabilirim?',
    placeholder: 'Mesajınızı yazın...',
    offlineMessage: 'Şu anda çevrimiçi değiliz. Mesajınızı bırakın, en kısa sürede dönüş yapacağız.',
    colors: {
      primary: '#4F46E5',
      secondary: '#10B981',
      text: '#1F2937',
      background: '#FFFFFF'
    },
    position: 'right',
    showOperatorAvatar: true,
    soundEnabled: true
  });
});

// Conversation detayı
app.get('/api/v1/conversations/:chatId', (req, res) => {
  const conversation = socketService.getConversation(req.params.chatId);
  if (!conversation) {
    return res.status(404).json({ error: 'Sohbet bulunamadı' });
  }
  res.json(conversation);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint bulunamadı' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: 'Sunucu hatası' });
});

// ============ Socket.io Başlat ============

socketService.initialize(io);

// ============ Server Başlat ============

const PORT = config.server.port;

server.listen(PORT, '0.0.0.0', () => {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║                                            ║');
  console.log('║   🚀 LiveChat Pro Server                   ║');
  console.log('║                                            ║');
  console.log(`║   🌐 HTTP:   http://localhost:${PORT}          ║`);
  console.log(`║   🔌 Socket: ws://localhost:${PORT}            ║`);
  console.log(`║   📦 Widget: http://localhost:${PORT}/widget   ║`);
  console.log('║                                            ║');
  console.log(`║   📊 Ortam: ${config.server.env.padEnd(25)}║`);
  console.log('║                                            ║');
  console.log('╚════════════════════════════════════════════╝');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM alındı, kapatılıyor...');
  server.close(() => {
    console.log('Server kapatıldı');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT alındı, kapatılıyor...');
  server.close(() => {
    console.log('Server kapatıldı');
    process.exit(0);
  });
});

module.exports = { app, server, io };
