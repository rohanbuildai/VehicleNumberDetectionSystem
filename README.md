# 🚗 PlateDetect AI — Vehicle Number Plate Detection System

A **production-ready**, full-stack MERN application for AI-powered vehicle license plate detection, image enhancement, and fleet intelligence. Built with enterprise security, real-time WebSocket updates, and Docker deployment support.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    NGINX (Port 80/443)                   │
│         Reverse Proxy + Rate Limiting + SSL              │
└────────────┬────────────────────────────┬───────────────┘
             │                            │
    ┌────────▼──────┐           ┌─────────▼─────┐
    │   Frontend    │           │    Backend     │
    │  React + SPA  │           │  Node/Express  │
    │   (Port 80)   │           │  (Port 5000)   │
    └───────────────┘           └────────┬───────┘
                                         │
                          ┌──────────────┼──────────────┐
                          │              │              │
                   ┌──────▼──┐    ┌──────▼──┐   ┌──────▼──┐
                   │ MongoDB │    │  Redis  │   │  Sharp  │
                   │  (DB)   │    │ (Cache) │   │  (OCR)  │
                   └─────────┘    └─────────┘   └─────────┘
```

---

## ✨ Features

### 🔍 Detection & Processing
- **AI Plate Detection** — Multi-algorithm pipeline with OCR (Google Vision API or mock)
- **Image Enhancement** — Contrast boost, denoising, sharpening, normalization
- **Preprocessing Pipeline** — Grayscale, binarization, morphological operations
- **Bounding Box Annotation** — Visual plate highlighting on output images
- **Plate Cropping** — Auto-extracted cropped plate images
- **Image Quality Analysis** — Brightness, contrast, sharpness scoring
- **Multi-format Support** — JPEG, PNG, WebP, GIF, BMP, TIFF (up to 10MB)
- **Batch Format Conversion** — Convert to WebP, PNG, JPEG

### 🔐 Security
- **JWT + Refresh Token** rotation with secure HttpOnly cookies
- **API Key Authentication** for programmatic access
- **Rate Limiting** — Per-route limits (auth: 5/15min, detect: 10/min)
- **Helmet.js** — Security headers (CSP, HSTS, XSS Protection)
- **MongoDB Sanitization** — Injection prevention
- **XSS Protection** — Input sanitization
- **HPP** — HTTP Parameter Pollution prevention
- **Account Lockout** — After 5 failed login attempts (2hr lock)
- **CORS** — Strict origin control

### 📡 Real-time
- **WebSocket** (Socket.IO) for live detection progress updates
- Stage-by-stage progress: analyzing → enhancing → detecting → annotating → saving
- Real-time job completion notifications

### 📊 Analytics & Dashboard
- Detection activity chart (14-day area chart)
- Monthly usage ring chart with plan limits
- Top detected plates leaderboard
- Per-detection image quality metrics
- Processing time breakdowns

### 🚗 Vehicle Intelligence
- Auto-tracked vehicle records per plate
- Detection frequency counting
- Alert system (stolen, wanted, expired)
- Flag suspicious vehicles
- Regional plate format validation (India, US, UK, EU, UAE)

### ⚡ Performance
- **Redis caching** — User sessions, analytics, API responses
- **MongoDB connection pooling** — 10 connections max
- **Compression middleware** — GZIP responses
- **Lazy loading** — Images processed async, non-blocking API response
- **Mongoose indexes** — Optimized query performance

### 🤖 AI Agents (Advanced)
- **Image Analysis Agent** — Quality assessment, brightness/contrast analysis, sharpness estimation, noise detection, dominant color extraction
- **Anomaly Detection Agent** — Pattern-based detection, statistical anomaly detection, risk assessment, recommendation generation
- **Prediction & Insights Agent** — Usage pattern analysis, time-based predictions, fleet analytics, vehicle type prediction
- **Smart Processing Agent** — Intelligent pipeline generation, multi-strategy comparison, automated optimization, result validation

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB 7+
- Redis 7+ (optional, gracefully degraded)
- Docker & Docker Compose (for containerized deployment)

### 1. Clone & Setup
```bash
git clone <repo-url> vehicle-plate-detection
cd vehicle-plate-detection

# Copy environment files
cp .env.example .env
cp backend/.env.example backend/.env
```

### 2. Configure Environment
Edit `.env` and `backend/.env` with your values:
```env
JWT_SECRET=your_long_random_secret_here        # min 32 chars
REFRESH_TOKEN_SECRET=another_long_secret_here  # min 32 chars
MONGODB_URI=mongodb://localhost:27017/vehicle_detection
GOOGLE_CLOUD_API_KEY=                          # optional (uses mock without it)
```

### 3. Development Mode
```bash
# Backend
cd backend
npm install
npm run dev    # runs on :5000

# Frontend (new terminal)
cd frontend
npm install
npm start      # runs on :3000
```

### 4. Docker Deployment (Recommended)
```bash
# Generate secrets
export JWT_SECRET=$(openssl rand -base64 64)
export REFRESH_TOKEN_SECRET=$(openssl rand -base64 64)

# Start all services
docker-compose up -d --build

# View logs
docker-compose logs -f backend

# Health check
curl http://localhost:5000/health
```

---

## 📡 API Reference

Base URL: `http://localhost:5000/api/v1`

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Login |
| POST | `/auth/logout` | Logout |
| GET | `/auth/me` | Current user |
| POST | `/auth/refresh-token` | Refresh JWT |
| POST | `/auth/forgot-password` | Send reset email |
| PUT | `/auth/reset-password/:token` | Reset password |
| GET | `/auth/verify-email/:token` | Verify email |
| POST | `/auth/generate-api-key` | Generate API key |

### Detection
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/detection/detect` | Submit for detection (multipart) |
| POST | `/detection/process` | Process image only (no detection) |
| GET | `/detection` | List detections (paginated) |
| GET | `/detection/:id` | Get single detection |
| GET | `/detection/job/:jobId` | Poll job status |
| GET | `/detection/stats` | Detection statistics |
| DELETE | `/detection/:id` | Delete detection |
| PATCH | `/detection/:id/favorite` | Toggle favorite |

### Images
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/images/analyze` | Analyze image quality |
| POST | `/images/enhance` | Enhance image |
| POST | `/images/convert` | Convert format |

### Vehicles
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/vehicles` | List tracked vehicles |
| GET | `/vehicles/:id` | Get vehicle details |
| PUT | `/vehicles/:id` | Update vehicle |
| DELETE | `/vehicles/:id` | Delete vehicle |
| POST | `/vehicles/:id/alerts` | Add alert |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/analytics/dashboard` | Full dashboard data |

### Auth Headers
```
Authorization: Bearer <jwt_token>
# OR
x-api-key: pk_live_<your_api_key>
```

---

## 🌍 Plate Format Support
| Region | Format | Example |
|--------|--------|---------|
| 🇮🇳 India | AA00AAA0000 | MH12AB1234 |
| 🇺🇸 USA | State-specific | ABC1234 |
| 🇬🇧 UK | AA00AAA | AB12CDE |
| 🇪🇺 Europe | Varies | ABC-123 |
| 🇦🇪 UAE | AAA00000 | DXB12345 |

---

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Redux Toolkit, React Router v6, Recharts, Framer Motion |
| Backend | Node.js 20, Express 4, Socket.IO |
| Database | MongoDB 7 + Mongoose ODM |
| Cache | Redis 7 + ioredis |
| Image Processing | Sharp (native C++ bindings) |
| OCR | Google Cloud Vision API (mock fallback) |
| Auth | JWT + Refresh Tokens + API Keys |
| Security | Helmet, HPP, mongo-sanitize, xss-clean, express-rate-limit |
| Email | Nodemailer |
| Logging | Winston (file + console) |
| Deployment | Docker + Docker Compose + Nginx |
| **AI Agents** | Image Analysis, Anomaly Detection, Prediction & Insights, Smart Processing |

---

## 📁 Project Structure

```
vehicle-plate-detection/
├── backend/
│   ├── config/           # DB, Redis, Logger, Socket
│   ├── controllers/      # Auth, Detection
│   ├── middleware/        # Auth, Upload, RateLimit, ErrorHandler, Validate
│   ├── models/           # User, Detection, Vehicle
│   ├── routes/           # All API routes
│   ├── services/         # ImageProcessing, OCR
│   ├── utils/            # ErrorResponse, sendEmail
│   ├── uploads/          # original/, processed/, plates/
│   ├── logs/             # Winston log files
│   ├── server.js         # Entry point
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/   # Auth, Layout
│   │   ├── pages/        # Landing, Auth, Dashboard, Detect, History, Vehicles, Profile
│   │   ├── services/     # API, Socket
│   │   ├── store/        # Redux slices: auth, detection, ui
│   │   └── App.js
│   └── Dockerfile
├── nginx/
│   └── nginx.conf
├── docker-compose.yml
└── .env.example
```

---

## 🔧 Production Checklist

- [ ] Set strong `JWT_SECRET` and `REFRESH_TOKEN_SECRET` (64+ chars)
- [ ] Configure real SMTP credentials for email
- [ ] Add `GOOGLE_CLOUD_API_KEY` for real OCR (optional)
- [ ] Set `CORS_ORIGIN` to your production domain
- [ ] Enable SSL in nginx.conf and mount certificates
- [ ] Configure MongoDB Atlas for managed database
- [ ] Set `NODE_ENV=production` in all containers
- [ ] Set up log rotation and monitoring
- [ ] Configure Cloudinary or S3 for image storage at scale
- [ ] Enable MongoDB authentication with least-privilege user

---

## 📝 License

MIT — Free for personal and commercial use.
