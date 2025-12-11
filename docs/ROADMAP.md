# 🗺️ LiveChat Pro - Geliştirme Yol Haritası

Bu döküman, projenin gelecek geliştirmeleri için detaylı bir yol haritası içerir.

---

## 📋 Faz 1: Temel Altyapı ✅ (Tamamlandı)

### Backend
- [x] Express.js sunucu kurulumu
- [x] Socket.io entegrasyonu
- [x] Temel API endpoints
- [x] Config yönetimi
- [x] CORS ve güvenlik middleware'leri

### Web Widget
- [x] Embed edilebilir JavaScript widget
- [x] WhatsApp benzeri UI
- [x] Socket.io bağlantısı
- [x] Mesaj gönderme/alma
- [x] Typing indicator
- [x] Responsive tasarım

### Mobil Uygulama
- [x] React Native / Expo kurulumu
- [x] Navigation yapısı
- [x] Login ekranı
- [x] Sohbet listesi
- [x] Chat ekranı
- [x] Bekleyen sohbetler
- [x] Ayarlar ekranı
- [x] Zustand state yönetimi

---

## 📋 Faz 2: Veri Kalıcılığı (Öncelikli)

### MongoDB Entegrasyonu
```javascript
// Yapılacaklar:
- [ ] Mongoose bağlantı yönetimi
- [ ] User CRUD işlemleri
- [ ] Conversation CRUD işlemleri  
- [ ] Message CRUD işlemleri
- [ ] Index optimizasyonları
```

### Dosya Örneği: `backend/src/services/databaseService.js`
```javascript
const mongoose = require('mongoose');
const config = require('../config');

class DatabaseService {
  async connect() {
    try {
      await mongoose.connect(config.database.uri, config.database.options);
      console.log('✅ MongoDB bağlantısı başarılı');
    } catch (error) {
      console.error('❌ MongoDB bağlantı hatası:', error);
      process.exit(1);
    }
  }
}
```

### JWT Authentication
```javascript
// Yapılacaklar:
- [ ] Login/Register API endpoints
- [ ] JWT token oluşturma
- [ ] Refresh token mekanizması
- [ ] Auth middleware
- [ ] Password hashing (bcrypt)
```

---

## 📋 Faz 3: Gelişmiş Özellikler

### Push Notifications (Firebase)

#### Backend Kurulumu
```javascript
// backend/src/services/pushService.js
const admin = require('firebase-admin');

class PushService {
  initialize() {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }

  async sendNotification(token, title, body, data = {}) {
    const message = {
      notification: { title, body },
      data,
      token
    };
    return admin.messaging().send(message);
  }
}
```

#### Mobil App Kurulumu
```javascript
// Expo notifications kurulumu
import * as Notifications from 'expo-notifications';

// Token alma
const token = await Notifications.getExpoPushTokenAsync();

// Backend'e kaydet
await api.updateFCMToken(token.data);
```

### Dosya Paylaşımı

#### Backend
```javascript
// Yapılacaklar:
- [ ] Multer konfigürasyonu
- [ ] Dosya validasyonu (tip, boyut)
- [ ] Dosya depolama (local/S3)
- [ ] Thumbnail oluşturma (resimler için)
- [ ] Dosya silme
```

#### Örnek Upload Endpoint
```javascript
// backend/src/routes/upload.js
const multer = require('multer');
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    cb(null, allowed.includes(file.mimetype));
  }
});

router.post('/upload', auth, upload.single('file'), async (req, res) => {
  // Dosya işleme
});
```

### Hazır Yanıtlar (Canned Responses)

#### Veri Modeli
```javascript
const cannedResponseSchema = new mongoose.Schema({
  title: String,
  shortcut: String,     // örn: "/selamla"
  content: String,
  category: String,
  createdBy: { type: ObjectId, ref: 'User' },
  isGlobal: Boolean,    // Tüm operatörler kullanabilir mi
});
```

#### Kullanım
```javascript
// Mobil app'te "/" ile başlayan mesajları yakala
if (text.startsWith('/')) {
  const shortcut = text.split(' ')[0];
  const response = await getCannedResponse(shortcut);
  if (response) {
    setInputText(response.content);
  }
}
```

---

## 📋 Faz 4: Enterprise Özellikler

### Departman Yönetimi

#### Veri Modeli
```javascript
const departmentSchema = new mongoose.Schema({
  name: String,
  description: String,
  isActive: Boolean,
  workingHours: {
    start: String,  // "09:00"
    end: String,    // "18:00"
    days: [Number]  // [1,2,3,4,5] = Pazartesi-Cuma
  },
  autoAssign: Boolean,
  operators: [{ type: ObjectId, ref: 'User' }],
  welcomeMessage: String,
  offlineMessage: String,
});
```

### Sohbet Routing
```javascript
// Otomatik atama algoritması
async function assignChat(conversation) {
  // 1. Departmana göre operatörleri filtrele
  const operators = await getAvailableOperators(conversation.department);
  
  // 2. En az aktif sohbeti olan operatörü seç
  operators.sort((a, b) => a.activeChats.length - b.activeChats.length);
  
  // 3. Ata
  return operators[0];
}
```

### Raporlama ve Analitik

#### Metrikler
```javascript
const analyticsSchema = new mongoose.Schema({
  date: Date,
  metrics: {
    totalChats: Number,
    resolvedChats: Number,
    missedChats: Number,
    avgResponseTime: Number,    // saniye
    avgChatDuration: Number,    // dakika
    avgRating: Number,
    messagesByHour: [Number],   // 24 elemanlı array
  },
  operatorStats: [{
    operator: ObjectId,
    chats: Number,
    messages: Number,
    avgResponseTime: Number,
    rating: Number,
  }]
});
```

#### Dashboard Endpoints
```javascript
// GET /api/v1/analytics/overview
// GET /api/v1/analytics/operators
// GET /api/v1/analytics/chats?from=&to=
// GET /api/v1/analytics/export?format=csv
```

---

## 📋 Faz 5: Ölçeklendirme

### Redis Adapter
```javascript
// Socket.io cluster desteği için
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

const pubClient = createClient({ url: 'redis://localhost:6379' });
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

### Docker Kurulumu

#### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000
CMD ["node", "server.js"]
```

#### docker-compose.yml
```yaml
version: '3.8'
services:
  app:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/livechat
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongo
      - redis

  mongo:
    image: mongo:6
    volumes:
      - mongo_data:/data/db

  redis:
    image: redis:7-alpine

volumes:
  mongo_data:
```

### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: livechat-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: livechat-backend
  template:
    spec:
      containers:
      - name: backend
        image: livechat-pro:latest
        ports:
        - containerPort: 3000
        env:
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: livechat-secrets
              key: redis-url
```

---

## 📋 Güvenlik Kontrol Listesi

### Backend
- [ ] Helmet.js (HTTP güvenlik headers)
- [ ] Rate limiting
- [ ] Input validation (Joi/Yup)
- [ ] SQL/NoSQL injection koruması
- [ ] XSS koruması
- [ ] CSRF koruması
- [ ] Secure cookies
- [ ] HTTPS zorunluluğu

### Mobil App
- [ ] Secure storage (Expo SecureStore)
- [ ] Certificate pinning
- [ ] Root/Jailbreak detection
- [ ] Biometric authentication
- [ ] App integrity check

### Web Widget
- [ ] CSP (Content Security Policy)
- [ ] Iframe sandboxing
- [ ] Postmessage validation

---

## 📋 Test Stratejisi

### Unit Tests
```javascript
// Jest ile test örneği
describe('SocketService', () => {
  it('should register visitor correctly', () => {
    // ...
  });
  
  it('should handle message sending', () => {
    // ...
  });
});
```

### Integration Tests
```javascript
// Supertest ile API testleri
describe('Chat API', () => {
  it('GET /api/v1/conversations should return chats', async () => {
    const res = await request(app)
      .get('/api/v1/conversations')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(200);
  });
});
```

### E2E Tests
```javascript
// Detox ile mobil app testleri
describe('Chat Flow', () => {
  it('should send and receive messages', async () => {
    await element(by.id('chat-input')).typeText('Hello');
    await element(by.id('send-button')).tap();
    await expect(element(by.text('Hello'))).toBeVisible();
  });
});
```

---

## 📋 Öncelik Sıralaması

### Yüksek Öncelik (Hemen)
1. MongoDB entegrasyonu
2. JWT authentication
3. Push notifications

### Orta Öncelik (1-2 hafta)
4. Dosya paylaşımı
5. Hazır yanıtlar
6. Sohbet transfer

### Düşük Öncelik (Sonra)
7. Departman yönetimi
8. Analitik dashboard
9. Docker/Kubernetes

---

## 📝 Notlar

- Her yeni özellik için branch açılmalı
- Commit mesajları conventional commits formatında olmalı
- PR'lar en az 1 review almalı
- Kritik değişiklikler için migration script yazılmalı
- API değişiklikleri için versiyon güncellenmeli

---

*Son güncelleme: 2024*
