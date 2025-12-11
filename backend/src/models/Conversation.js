/**
 * Conversation Model - Sohbet Oturumları
 * Her web ziyaretçisi için bir conversation oluşturulur
 */

const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  // Benzersiz Sohbet ID
  chatId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Ziyaretçi Bilgileri
  visitor: {
    id: { type: String, required: true },
    name: { type: String, default: 'Ziyaretçi' },
    email: { type: String, default: null },
    phone: { type: String, default: null },
    avatar: { type: String, default: null },
    
    // Teknik Bilgiler
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    browser: { type: String, default: null },
    os: { type: String, default: null },
    device: { type: String, default: null },
    
    // Konum (opsiyonel)
    location: {
      country: { type: String, default: null },
      city: { type: String, default: null }
    },
    
    // Kaynak
    referrer: { type: String, default: null },
    currentPage: { type: String, default: null },
    landingPage: { type: String, default: null }
  },

  // Atanan Operatör
  operator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // Departman (ilerisi için)
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null
  },

  // Durum
  status: {
    type: String,
    enum: ['pending', 'active', 'waiting', 'resolved', 'closed', 'missed'],
    default: 'pending'
  },

  // Öncelik
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },

  // Etiketler (ilerisi için)
  tags: [{
    type: String
  }],

  // Mesaj Sayıları
  messageCount: {
    total: { type: Number, default: 0 },
    visitor: { type: Number, default: 0 },
    operator: { type: Number, default: 0 }
  },

  // Son Mesaj Özeti
  lastMessage: {
    content: { type: String, default: null },
    sender: { type: String, enum: ['visitor', 'operator', 'system'], default: null },
    timestamp: { type: Date, default: null }
  },

  // Okunmamış Mesaj Sayısı
  unreadCount: {
    visitor: { type: Number, default: 0 },
    operator: { type: Number, default: 0 }
  },

  // Typing durumu
  typing: {
    visitor: { type: Boolean, default: false },
    operator: { type: Boolean, default: false }
  },

  // Zaman Bilgileri
  startedAt: {
    type: Date,
    default: Date.now
  },
  firstResponseAt: {
    type: Date,
    default: null
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  closedAt: {
    type: Date,
    default: null
  },

  // Değerlendirme (ilerisi için)
  rating: {
    score: { type: Number, min: 1, max: 5, default: null },
    comment: { type: String, default: null },
    ratedAt: { type: Date, default: null }
  },

  // Notlar (operatör için)
  notes: [{
    content: String,
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    addedAt: { type: Date, default: Date.now }
  }],

  // Widget bilgileri
  widget: {
    id: { type: String, default: 'default' },
    domain: { type: String, default: null }
  },

  // Metadata (esnek alan)
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// İndexler
conversationSchema.index({ status: 1, createdAt: -1 });
conversationSchema.index({ operator: 1, status: 1 });
conversationSchema.index({ 'visitor.id': 1 });
conversationSchema.index({ 'lastMessage.timestamp': -1 });

// Statik metodlar
conversationSchema.statics.getPendingChats = function() {
  return this.find({ status: 'pending' })
    .sort({ createdAt: 1 })
    .populate('operator', 'name avatar');
};

conversationSchema.statics.getActiveChats = function(operatorId) {
  return this.find({ 
    operator: operatorId, 
    status: { $in: ['active', 'waiting'] }
  })
  .sort({ 'lastMessage.timestamp': -1 })
  .populate('operator', 'name avatar');
};

// İnstance metodlar
conversationSchema.methods.assignOperator = async function(operatorId) {
  this.operator = operatorId;
  this.status = 'active';
  return this.save();
};

conversationSchema.methods.updateLastMessage = function(content, sender) {
  this.lastMessage = {
    content: content.substring(0, 100),
    sender,
    timestamp: new Date()
  };
  this.messageCount.total += 1;
  this.messageCount[sender] += 1;
  return this.save();
};

module.exports = mongoose.model('Conversation', conversationSchema);
