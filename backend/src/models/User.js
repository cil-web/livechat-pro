/**
 * User Model - Operatörler/Admin için
 * İleriye dönük: Roller, departmanlar, izinler eklenebilir
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Temel Bilgiler
  name: {
    type: String,
    required: [true, 'İsim zorunludur'],
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: [true, 'Email zorunludur'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Şifre zorunludur'],
    minlength: 6,
    select: false
  },
  avatar: {
    type: String,
    default: null
  },

  // Rol ve Yetki
  role: {
    type: String,
    enum: ['operator', 'supervisor', 'admin', 'super_admin'],
    default: 'operator'
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
    enum: ['available', 'busy', 'away', 'offline'],
    default: 'offline'
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },

  // Aktif Chatler
  activeChats: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation'
  }],
  maxConcurrentChats: {
    type: Number,
    default: 10
  },

  // İstatistikler (ilerisi için)
  stats: {
    totalChats: { type: Number, default: 0 },
    totalMessages: { type: Number, default: 0 },
    avgResponseTime: { type: Number, default: 0 },
    rating: { type: Number, default: 0 }
  },

  // Push Notification Token
  fcmToken: {
    type: String,
    default: null
  },

  // Ayarlar
  settings: {
    notifications: { type: Boolean, default: true },
    sound: { type: Boolean, default: true },
    language: { type: String, default: 'tr' }
  },

  // Soft Delete
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Şifre hashleme
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Şifre karşılaştırma
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Online durumu güncelleme
userSchema.methods.setOnline = function() {
  this.isOnline = true;
  this.status = 'available';
  this.lastSeen = new Date();
  return this.save();
};

userSchema.methods.setOffline = function() {
  this.isOnline = false;
  this.status = 'offline';
  this.lastSeen = new Date();
  return this.save();
};

// JSON dönüşümünde hassas verileri çıkar
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
