# WebMeter API Server

WebMeter API Server สำหรับการจัดการข้อมูลผู้ใช้และระบบ Authentication

## การติดตั้งและเริ่มต้นใช้งาน

### 1. ติดตั้ง Dependencies
```bash
cd server
npm install
```

### 2. ตั้งค่า Environment Variables
คัดลอก `.env` และปรับแต่งค่าต่างๆ ตามสภาพแวดล้อมของคุณ

### 3. สร้าง Database
ก่อนเริ่ม API Server ต้องสร้าง PostgreSQL database ก่อน:
```bash
# ใน Ubuntu/Linux
sudo -u postgres psql -f ../database/simple_user_database.sql
sudo -u postgres psql -f ../database/simple_user_data.sql
```

### 4. เริ่มต้น Server
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - เข้าสู่ระบบ
- `POST /api/auth/logout` - ออกจากระบบ
- `GET /api/auth/verify` - ตรวจสอบ token

### User Management
- `GET /api/users` - ดึงรายชื่อผู้ใช้ทั้งหมด
- `GET /api/users/:id` - ดึงข้อมูลผู้ใช้ตาม ID
- `POST /api/users` - สร้างผู้ใช้ใหม่
- `PUT /api/users/:id` - แก้ไขข้อมูลผู้ใช้
- `DELETE /api/users/:id` - ลบผู้ใช้
- `PATCH /api/users/:id/status` - เปลี่ยนสถานะผู้ใช้
- `GET /api/users/stats/summary` - สถิติสรุปผู้ใช้

### Health Check
- `GET /api/health` - ตรวจสอบสถานะ server

## การใช้งาน API

### สร้างผู้ใช้ใหม่
```bash
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Test123!",
    "name": "Test",
    "surname": "User",
    "address": "Test Address",
    "level": "Operator",
    "status": "active",
    "note": "Test user"
  }'
```

### ดึงรายชื่อผู้ใช้
```bash
curl http://localhost:3001/api/users
```

### ค้นหาผู้ใช้
```bash
curl "http://localhost:3001/api/users?search=admin&level=Admin&status=active"
```

## การเชื่อมต่อจาก Frontend

ใช้ `apiClient` ที่สร้างไว้ใน `src/services/api.ts`:

```typescript
import { apiClient } from '../services/api';

// ดึงรายชื่อผู้ใช้
const users = await apiClient.getUsers({
  search: 'admin',
  level: 'Admin',
  page: 1,
  limit: 10
});

// สร้างผู้ใช้ใหม่
const newUser = await apiClient.createUser({
  username: 'testuser',
  email: 'test@example.com',
  password: 'Test123!',
  name: 'Test',
  surname: 'User',
  level: 'Operator'
});
```

## การ Deploy

### ใน Production Environment:
1. ตั้งค่า `NODE_ENV=production` ใน `.env`
2. ใช้ reverse proxy (nginx) สำหรับ HTTPS
3. ตั้งค่า rate limiting และ security headers
4. ใช้ PM2 หรือ Docker สำหรับ process management

## Performance

- ใช้ Connection Pool สำหรับ PostgreSQL
- Rate limiting: 100 requests per 15 minutes
- Response caching สำหรับ static data
- Validation ด้วย Joi สำหรับข้อมูล input
- Password hashing ด้วย bcrypt (12 rounds)

## Security Features

- JWT Authentication
- Password hashing with bcrypt
- Rate limiting
- CORS protection
- Helmet.js security headers
- SQL injection protection ด้วย parameterized queries
- Input validation และ sanitization
