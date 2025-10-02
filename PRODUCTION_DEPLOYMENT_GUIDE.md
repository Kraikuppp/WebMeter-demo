# WebMeter Demo - Production Deployment Guide

## 🚀 การแก้ไขปัญหา Production Deployment

### ปัญหาที่พบ:
1. **Database Connection Timeout** - การเชื่อมต่อฐานข้อมูลหมดเวลา
2. **Express Trust Proxy Error** - ปัญหาการตั้งค่า rate limiting สำหรับ proxy
3. **CORS Policy** - Frontend ไม่สามารถเชื่อมต่อ Backend ได้

### การแก้ไขที่ทำ:

## 1. Database Configuration (✅ แก้ไขแล้ว)

### ปรับปรุง `server/config/database.js`:
- **เพิ่ม Production-optimized settings**:
  - ลดจำนวน max connections เป็น 10 ใน production
  - เพิ่ม connection timeout เป็น 10 วินาที
  - เพิ่ม acquire timeout เป็น 30 วินาที
  - เพิ่ม SSL configuration สำหรับ production
  - เพิ่ม keep-alive settings

- **เพิ่ม Error Handling**:
  - ไม่ exit process ใน production เมื่อเกิด error
  - เพิ่ม health check function
  - เพิ่ม graceful shutdown

```javascript
// Production-optimized connection settings
max: process.env.NODE_ENV === 'production' ? 10 : 20,
min: 2,
idleTimeoutMillis: 60000,
connectionTimeoutMillis: 10000,
acquireTimeoutMillis: 30000,

// SSL configuration for production
ssl: process.env.NODE_ENV === 'production' ? {
  rejectUnauthorized: false
} : false,
```

## 2. Express Trust Proxy (✅ แก้ไขแล้ว)

### ปรับปรุง `server/server.js`:
- **เพิ่ม Trust Proxy Configuration**:
```javascript
// Trust proxy for production deployment
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}
```

- **ปรับปรุง Rate Limiting**:
```javascript
// Production-safe rate limiting
keyGenerator: (req) => {
  return req.ip || req.connection.remoteAddress || 'unknown';
}
```

## 3. CORS Configuration (✅ แก้ไขแล้ว)

### เพิ่ม Production URLs:
```javascript
const allowedOrigins = [
  // Development URLs
  'http://localhost:8080',
  // Production URLs
  'https://web-meter-demo.vercel.app',
  'https://webmeter-frontend-demo.onrender.com',
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL
];
```

## 4. Export Scheduler Error Handling (✅ แก้ไขแล้ว)

### ปรับปรุง `server/services/exportScheduler.js`:
- **เพิ่ม Production-optimized Database Pools**
- **เพิ่ม Query Timeout (25 วินาที)**
- **เพิ่ม Individual Schedule Error Handling**
- **เพิ่ม Connection Recovery Logic**

```javascript
// Use dedicated client with timeout
client = await parametersPool.connect();
const queryTimeout = setTimeout(() => {
  console.warn('⚠️ Query timeout - cancelling database operation');
  client.release();
}, 25000);
```

## 5. Server Improvements (✅ แก้ไขแล้ว)

### เพิ่ม Production Features:
- **Graceful Shutdown**: ปิดระบบอย่างปลอดภัย
- **Database Health Check**: ตรวจสอบฐานข้อมูลก่อนเริ่ม scheduler
- **Uncaught Exception Handling**: จัดการ error ที่ไม่คาดคิด
- **Better Logging**: ลด log noise ใน production

## 📋 Environment Variables สำหรับ Production

### Render.com Environment Variables:
```bash
NODE_ENV=production
PORT=3001
DB_HOST=49.0.87.9
DB_PORT=5432
DB_NAME=webmeter_db
DB_USER=webmeter_app
DB_PASSWORD=WebMeter2024!
JWT_SECRET=your-super-secret-jwt-key
### 1. Backend (Render.com):
1. **Push code** ไปยัง GitHub repository
2. **เพิ่ม Environment Variables** ใน Render dashboard
3. **Deploy** และตรวจสอบ logs
4. **Test API endpoints** ผ่าน `/api/health`

### 2. Frontend (Vercel):
1. **Update API URL** ใน frontend configuration
2. **Push code** ไปยัง GitHub repository
3. **Deploy** ผ่าน Vercel dashboard
4. **Test** การเชื่อมต่อกับ backend

## 🧪 Testing Production Deployment

### 1. Health Check:
```bash
curl https://webmeter-backend-demo.onrender.com/api/health
```

### 2. Database Connection:
- ตรวจสอบ logs ว่าไม่มี connection timeout errors
- ตรวจสอบว่า Export Scheduler เริ่มทำงานได้

### 3. CORS:
- เปิด frontend และตรวจสอบว่าไม่มี CORS errors ใน browser console
- ทดสอบ login และ API calls

### 4. Rate Limiting:
- ตรวจสอบว่าไม่มี "X-Forwarded-For" errors ใน logs

## 📊 Monitoring

### ตรวจสอบ Logs ใน Production:
- **Render Logs**: ดู real-time logs ใน Render dashboard
- **Database Connections**: ตรวจสอบ connection pool status
- **Export Scheduler**: ตรวจสอบว่าทำงานได้ปกติ
- **Error Rates**: ติดตาม error patterns

### Key Metrics:
- **Response Time**: < 2 วินาที
- **Database Connection Pool**: < 80% utilization
- **Memory Usage**: < 512MB
- **Error Rate**: < 1%

## 🚨 Troubleshooting

### หาก Database ยังมีปัญหา:
1. ตรวจสอบ network connectivity ระหว่าง Render และ database server
2. ลองเพิ่ม `connectionTimeoutMillis` เป็น 20000 (20 วินาที)
3. ตรวจสอบว่า database server รองรับ SSL connections

### หาก CORS ยังมีปัญหา:
1. เพิ่ม actual production URLs ใน `allowedOrigins` array
2. ตรวจสอบว่า `FRONTEND_URL` environment variable ถูกต้อง
3. ลองเพิ่ม wildcard subdomain: `https://*.vercel.app`

### หาก Rate Limiting มีปัญหา:
1. ตรวจสอบว่า `app.set('trust proxy', 1)` ทำงานได้
2. ลองปิด rate limiting ชั่วคราว: `skip: () => true`
3. ตรวจสอบ proxy headers ใน request

## ✅ Expected Results

หลังจากการแก้ไข ระบบควรจะ:
- **ไม่มี Database Connection Timeout errors**
- **ไม่มี Trust Proxy ValidationError**
- **Frontend เชื่อมต่อ Backend ได้**
- **Export Scheduler ทำงานได้ปกติ**
- **API responses ภายใน 2 วินาที**

## 🔄 Next Steps

### 📋 Environment Variables ที่ต้องตั้งค่า:

#### **Backend (Render.com):**

⚠️ **Database Connection Issue**: 

**ปัญหา IP Address:**
- Local: `192.168.1.175` (Private IP - ใช้ได้ในวงแลน)
- Production: `49.0.87.9` (Public IP - ไม่สามารถเชื่อมต่อได้)

**ต้องตรวจสอบ:**

#### **Quick Fix - ใช้ Tunnel Service:**
```bash
# Option A: ngrok (ฟรี)
ngrok tcp 192.168.1.175:5432
# จะได้ URL เช่น: tcp://0.tcp.ngrok.io:12345

# Option B: Cloudflare Tunnel (ฟรี)
cloudflared tunnel --url tcp://192.168.1.175:5432

# แล้วใช้ URL ที่ได้ใน Environment Variables
DB_HOST=0.tcp.ngrok.io
DB_PORT=12345
```

#### **การตรวจสอบ Network:**
```bash
# 1. ตรวจสอบ Public IP จริง
curl ifconfig.me

# 2. ตรวจสอบ Port Forwarding ✅ ทำแล้ว
nmap -p 5432 49.0.87.9
# Result: PORT 5432/tcp closed ❌

# 3. ทดสอบ PostgreSQL จากภายนอก
psql -h 49.0.87.9 -p 5432 -U webmeter_app -d webmeter_db
```

#### **🔧 แก้ไข Port 5432 Closed:**

**1. Router Port Forwarding:**
```bash
# ใน Router Admin Panel ตั้งค่า:
External Port: 5432 → Internal IP: 192.168.1.175:5432
```

**2. Firewall Configuration:**
```bash
# Ubuntu/Debian (UFW):
sudo ufw allow 5432/tcp

# CentOS/RHEL (firewalld):
sudo firewall-cmd --permanent --add-port=5432/tcp
sudo firewall-cmd --reload

# iptables:
sudo iptables -A INPUT -p tcp --dport 5432 -j ACCEPT
```

**3. PostgreSQL Configuration:**
```bash
# แก้ไข /etc/postgresql/*/main/postgresql.conf
listen_addresses = '*'

# แก้ไข /etc/postgresql/*/main/pg_hba.conf
host all all 0.0.0.0/0 md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

**4. ทดสอบหลังแก้ไข:**
```bash
# ควรได้ผลลัพธ์: 5432/tcp open postgresql
nmap -p 5432 49.0.87.9
```

**แนะนำ Cloud Database:**
```bash
NODE_ENV=production
PORT=3001
# ใช้ Cloud Database แทน (เลือก 1 ใน 3):
# Option 1: Render PostgreSQL
DATABASE_URL=postgresql://username:password@hostname:port/database

# Option 2: Supabase
DB_HOST=db.xxx.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-supabase-password

# Option 3: Railway/PlanetScale/Neon
DB_HOST=your-cloud-db-host
DB_PORT=5432
DB_NAME=webmeter_db
DB_USER=webmeter_app
DB_PASSWORD=your-cloud-db-password

JWT_SECRET=your-super-secret-jwt-key
FRONTEND_URL=https://web-meter-demo.vercel.app
CLIENT_URL=https://web-meter-demo.vercel.app
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### **Frontend (Vercel):**
```bash
NODE_ENV=production
REACT_APP_API_URL=https://webmeter-backend-demo.onrender.com
```

### 🗄️ **Database Setup Requirements:**

**คุณใช้ 2 databases:**
1. **webmeter_db** - Users, authentication, roles
2. **parameters_db** - Meter data, parameters, readings

**ใน Render PostgreSQL ต้องสร้าง 2 databases:**

#### **Option A: สร้าง 2 Render PostgreSQL instances:**
```bash
# Database 1: Main Database
Name: webmeter-main-db
Database: webmeter_db
Tables: users, roles, events, etc.

# Database 2: Parameters Database  
Name: webmeter-parameters-db
Database: parameters_db
Tables: parameters_value, meter_info, etc.
```

#### **Option B: ใช้ 1 PostgreSQL instance แต่สร้าง 2 databases:**
```sql
-- ใน Render PostgreSQL console
CREATE DATABASE parameters_db;
GRANT ALL PRIVILEGES ON DATABASE parameters_db TO webmeter_db_user;
```

### 🛠️ **Option 2: แก้ไข Database Server (49.0.87.9):**

หากต้องการใช้ database server เดิม ต้องแก้ไข:

#### **1. PostgreSQL Configuration:**
```bash
# แก้ไข postgresql.conf
listen_addresses = '*'  # อนุญาต external connections

# แก้ไข pg_hba.conf
host all all 0.0.0.0/0 md5  # อนุญาต remote connections
```

#### **2. Firewall Configuration:**
```bash
# เปิด port 5432 สำหรับ external access
sudo ufw allow 5432/tcp
# หรือ
sudo iptables -A INPUT -p tcp --dport 5432 -j ACCEPT
```

#### **3. Network Security:**
```bash
# ตรวจสอบว่า Render IP ranges สามารถเข้าถึงได้
# หรือใช้ VPN/Tunnel สำหรับ secure connection
```

#### **4. Test Connection:**
```bash
# ทดสอบจาก external network
psql -h 49.0.87.9 -p 5432 -U webmeter_app -d webmeter_db
```

### 🔧 การตรวจสอบ:
1. **Monitor** production logs เป็นเวลา 24 ชั่วโมง
2. **Test** ฟีเจอร์ต่างๆ ใน production environment
3. **Optimize** database queries หากยังช้า
4. **Setup** monitoring และ alerting system
5. **Document** production configuration สำหรับทีม

---

**หมายเหตุ**: ไฟล์นี้ควรถูกอัปเดตเมื่อมีการเปลี่ยนแปลง production configuration
