/**
 * Message Model - Tüm Chat Mesajları
 * WhatsApp benzeri özellikler: durum, okundu bilgisi, medya desteği
 */

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  // İlişkili Sohbet
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },

  // Mesaj ID (client tarafında duplicate önleme için)
  messageId: {
    type: String,
    required: true,
    unique: true
  },

  // Gönderici
  sender: {
    type: {
      type: String,
      enum: ['visitor', 'operator', 'system', 'bot'],
      required: true
    },
    id: { type: String, required: true },
    name: { type: String, default: null }
  },

  // Mesaj İçeriği
  content: {
    type: {
      type: String,
      enum: ['text', 'image', 'file', 'audio', 'video', 'location', 'contact', 'sticker', 'quick_reply', 'card'],
      default: 'text'
    },
    text: { type: String, default: null },
    
    // Medya içeriği
    media: {
      url: { type: String, default: null },
      filename: { type: String, default: null },
      mimeType: { type: String, default: null },
      size: { type: Number, default: null },
      thumbnail: { type: String, default: null },
      duration: { type: Number, default: null }, // video/audio için
      dimensions: {
        width: { type: Number, default: null },
        height: { type: Number, default: null }
      }
    },
    
    // Konum içeriği
    location: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      address: { type: String, default: null }
    },
    
    // Quick Reply / Button içeriği (ilerisi için)
    buttons: [{
      id: String,
      text: String,
      action: String
    }],
    
    // Card içeriği (ilerisi için)
    card: {
      title: { type: String, default: null },
      subtitle: { type: String, default: null },
      imageUrl: { type: String, default: null },
      buttons: [{
        text: String,
        url: String
      }]
    }
  },

  // Mesaj Durumu (WhatsApp benzeri)
  status: {
    type: String,
    enum: ['sending', 'sent', 'delivered', 'read', 'failed'],
    default: 'sending'
  },

  // Durum Zaman Damgaları
  timestamps: {
    sent: { type: Date, default: null },
    delivered: { type: Date, default: null },
    read: { type: Date, default: null }
  },

  // Yanıtlanan Mesaj (reply özelliği)
  replyTo: {
    messageId: { type: String, default: null },
    content: { type: String, default: null },
    sender: { type: String, default: null }
  },

  // Mesaj Düzenleme (ilerisi için)
  edited: {
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date, default: null },
    originalContent: { type: String, default: null }
  },

  // Silme (soft delete)
  deleted: {
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: String, default: null }
  },

  // Sistem Mesajı Detayları
  systemData: {
    action: { type: String, default: null }, // 'chat_started', 'operator_joined', 'chat_transferred', etc.
    data: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} }
  },

  // Canned Response kullanıldı mı (analiz için)
  fromCannedResponse: {
    type: Boolean,
    default: false
  },

  // Metadata
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// İndexler
messageSchema.index({ conversation: 1, createdAt: 1 });
messageSchema.index({ messageId: 1 });
messageSchema.index({ 'sender.id': 1 });

// Statik metodlar
messageSchema.statics.getConversationMessages = function(conversationId, limit = 50, before = null) {
  const query = { 
    conversation: conversationId,
    'deleted.isDeleted': false
  };
  
  if (before) {
    query.createdAt = { $lt: before };
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit);
};

messageSchema.statics.markAsDelivered = function(messageIds) {
  return this.updateMany(
    { messageId: { $in: messageIds }, status: 'sent' },
    { 
      status: 'delivered',
      'timestamps.delivered': new Date()
    }
  );
};

messageSchema.statics.markAsRead = function(conversationId, readerId) {
  return this.updateMany(
    { 
      conversation: conversationId,
      'sender.id': { $ne: readerId },
      status: { $in: ['sent', 'delivered'] }
    },
    { 
      status: 'read',
      'timestamps.read': new Date()
    }
  );
};

// Instance metodlar
messageSchema.methods.softDelete = function(deletedBy) {
  this.deleted = {
    isDeleted: true,
    deletedAt: new Date(),
    deletedBy
  };
  return this.save();
};

// Mesajı güvenli formatta döndür
messageSchema.methods.toSafeObject = function() {
  if (this.deleted.isDeleted) {
    return {
      messageId: this.messageId,
      deleted: true,
      createdAt: this.createdAt
    };
  }
  return this.toObject();
};

module.exports = mongoose.model('Message', messageSchema);
