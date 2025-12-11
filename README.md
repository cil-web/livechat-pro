# 💬 LiveChat Pro

WhatsApp benzeri gerçek zamanlı canlı destek sistemi. Web sitesi ziyaretçileri ile mobil uygulama üzerinden iletişim kurmanızı sağlar.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)

## 🌟 Özellikler

### Mevcut Özellikler (v1.0)
- ✅ Gerçek zamanlı mesajlaşma (Socket.io)
- ✅ Web widget (herhangi bir siteye embed edilebilir)
- ✅ Mobil operatör uygulaması (React Native / Expo)
- ✅ Mesaj durumu göstergeleri (gönderildi/okundu)
- ✅ "Yazıyor..." göstergesi
- ✅ Çoklu operatör desteği
- ✅ Bekleyen sohbet kuyruğu
- ✅ Sohbet kabul/kapatma
- ✅ Operatör durum yönetimi (müsait/meşgul/uzakta)
- ✅ Pre-chat form (isim, email)
- ✅ Responsive tasarım

### Planlanan Özellikler (Roadmap)
- 🔜 Push notifications (Firebase Cloud Messaging)
- 🔜 Dosya/resim paylaşımı
- 🔜 Hazır yanıtlar (canned responses)
- 🔜 Sohbet transfer
- 🔜 Departman yönetimi
- 🔜 Offline mesaj bırakma
- 🔜 Sohbet değerlendirmesi
- 🔜 Analitik dashboard
- 🔜 MongoDB entegrasyonu
- 🔜 End-to-end şifreleme

## 🏗️ Mimari

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web Widget    │────▶│  Node.js +      │◀────│  Mobile App     │
│   (JavaScript)  │     │  Socket.io      │     │  (React Native) │
│                 │◀────│  Backend        │────▶│                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │                       ▼                       │
        │               ┌─────────────────┐             │
        │               │   MongoDB       │             │
        │               │   (Opsiyonel)   │             │
        │               └─────────────────┘             │
        │                       │                       │
        ▼                       ▼                       ▼
   Ziyaretçi              Veri Saklama             Operatör
```

## 📁 Proje Yapısı

```
livechat-pro/
├── backend/                    # Node.js Backend
│   ├── server.js              # Ana sunucu dosyası
│   ├── package.json
│   └── src/
│       ├── config/            # Konfigürasyon
│       ├── models/            # Mongoose modelleri
│       ├── services/          # Socket servisi
│       ├── controllers/       # API kontrolcüleri
│       ├── routes/            # API rotaları
│       └── middleware/        # Ara yazılımlar
│
├── web-widget/                # Web Chat Widget
│   ├── widget.js             # Ana widget kodu
│   ├── widget.css            # Widget stilleri
│   └── demo.html             # Demo sayfası
│
├── mobile-app/                # React Native App
│   ├── App.js                # Ana uygulama
│   ├── package.json
│   └── src/
│       ├── screens/          # Ekranlar
│       ├── store/            # Zustand store
│       ├── services/         # Socket servisi
│       ├── components/       # Ortak bileşenler
│       └── utils/            # Yardımcı fonksiyonlar
│
└── docs/                      # Dokümantasyon
```

## 🚀 Kurulum

### Gereksinimler
- Node.js >= 18.0.0
- npm veya yarn
- Expo CLI (mobil app için)

### 1. Backend Kurulumu

```bash
cd backend
npm install
npm run dev
```

Sunucu http://localhost:3000 adresinde çalışacaktır.

### 2. Web Widget Test

Backend çalışırken, tarayıcıda şu adresi açın:
```
http://localhost:3000/widget/demo.html
```

### 3. Mobil Uygulama Kurulumu

```bash
cd mobile-app
npm install
npx expo start
```

Expo Go uygulaması ile QR kodu okutarak test edebilirsiniz.

## 🔧 Konfigürasyon

### Backend (.env)

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/livechat_pro
JWT_SECRET=your-secret-key
CORS_ORIGIN=*
```

### Widget Entegrasyonu

Web sitenize eklemek için:

```html
<script 
  src="https://your-server.com/widget/widget.js"
  data-server="https://your-server.com"
  data-company="Şirket Adınız"
  data-color="#4F46E5"
  data-welcome="Merhaba! Size nasıl yardımcı olabilirim?"
></script>
```

#### Widget Parametreleri

| Parametre | Açıklama | Varsayılan |
|-----------|----------|------------|
| `data-server` | Backend sunucu adresi | `http://localhost:3000` |
| `data-company` | Şirket/destek adı | `Canlı Destek` |
| `data-color` | Ana renk (hex) | `#4F46E5` |
| `data-position` | Widget konumu (left/right) | `right` |
| `data-welcome` | Karşılama mesajı | `Merhaba! Size nasıl yardımcı olabilirim?` |

### Widget JavaScript API

```javascript
// Widget'ı aç
LiveChatPro.open();

// Widget'ı kapat
LiveChatPro.close();

// Widget'ı aç/kapat
LiveChatPro.toggle();

// Mesaj gönder
LiveChatPro.sendMessage('Merhaba!');
```

## 📱 Mobil Uygulama Build

### Android APK

```bash
cd mobile-app
eas build --platform android --profile preview
```

### iOS IPA

```bash
cd mobile-app
eas build --platform ios --profile preview
```

> Not: iOS build için Apple Developer hesabı gereklidir.

## 🔌 Socket.io Olayları

### Client → Server

| Olay | Açıklama |
|------|----------|
| `register` | Kullanıcı kaydı (visitor/operator) |
| `message:send` | Mesaj gönder |
| `message:typing` | Yazıyor durumu |
| `message:read` | Mesaj okundu |
| `chat:accept` | Sohbeti kabul et |
| `chat:close` | Sohbeti kapat |
| `chat:transfer` | Sohbeti transfer et |
| `operator:status` | Operatör durumu |

### Server → Client

| Olay | Açıklama |
|------|----------|
| `registered` | Kayıt başarılı |
| `message:receive` | Yeni mesaj |
| `message:sent` | Mesaj gönderildi onayı |
| `message:status` | Mesaj durumu güncellendi |
| `typing` | Yazıyor bildirimi |
| `chat:new` | Yeni sohbet talebi |
| `chat:accepted` | Sohbet kabul edildi |
| `chat:closed` | Sohbet kapatıldı |

## 🗺️ Geliştirme Yol Haritası

### Faz 1 - Temel Özellikler ✅
- [x] Backend altyapısı
- [x] Web widget
- [x] Mobil uygulama temel ekranları
- [x] Gerçek zamanlı mesajlaşma
- [x] Mesaj durumları

### Faz 2 - Gelişmiş Özellikler (Sonraki)
- [ ] MongoDB kalıcı depolama
- [ ] JWT authentication
- [ ] Push notifications
- [ ] Dosya paylaşımı
- [ ] Hazır yanıtlar

### Faz 3 - Enterprise Özellikler
- [ ] Departman yönetimi
- [ ] Supervisor dashboard
- [ ] Raporlama ve analitik
- [ ] Webhook entegrasyonları
- [ ] API rate limiting

### Faz 4 - Ölçeklendirme
- [ ] Redis adapter (cluster desteği)
- [ ] Load balancing
- [ ] Docker containerization
- [ ] Kubernetes deployment
- [ ] CDN entegrasyonu

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'feat: Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📄 Lisans

MIT License - detaylar için [LICENSE](LICENSE) dosyasına bakın.

## 🙏 Teşekkürler

- [Socket.io](https://socket.io/)
- [React Native](https://reactnative.dev/)
- [Expo](https://expo.dev/)
- [Zustand](https://github.com/pmndrs/zustand)

---

<p align="center">
  Made with ❤️ for better customer support
</p>
