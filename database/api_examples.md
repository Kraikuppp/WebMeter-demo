# Holiday & FT Configuration API Examples

## Holiday API Examples

### 1. Get All Holidays

```bash
# Get all holidays
curl -X GET "http://localhost:3001/api/holiday"

# Get holidays for specific year
curl -X GET "http://localhost:3001/api/holiday?year=2024"

# Get annual holidays only
curl -X GET "http://localhost:3001/api/holiday?category=annual"

# Get religious holidays only
curl -X GET "http://localhost:3001/api/holiday?type=religious"

# Get holidays with pagination
curl -X GET "http://localhost:3001/api/holiday?limit=10&offset=0"
```

### 2. Get Holiday by ID

```bash
curl -X GET "http://localhost:3001/api/holiday/1"
```

### 3. Create New Holiday

```bash
curl -X POST "http://localhost:3001/api/holiday" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2024-12-25",
    "name_th": "วันคริสต์มาส",
    "name_en": "Christmas Day",
    "type": "observance",
    "category": "special",
    "created_by": "admin"
  }'
```

### 4. Update Holiday

```bash
curl -X PUT "http://localhost:3001/api/holiday/1" \
  -H "Content-Type: application/json" \
  -d '{
    "name_th": "วันคริสต์มาส (แก้ไข)",
    "name_en": "Christmas Day (Updated)",
    "updated_by": "admin"
  }'
```

### 5. Delete Holiday

```bash
curl -X DELETE "http://localhost:3001/api/holiday/1" \
  -H "Content-Type: application/json" \
  -d '{
    "deleted_by": "admin"
  }'
```

### 6. Get Holidays by Year Range

```bash
# Get holidays from 2023 to 2025
curl -X GET "http://localhost:3001/api/holiday/range/2023/2025"

# Get annual holidays from 2023 to 2025
curl -X GET "http://localhost:3001/api/holiday/range/2023/2025?category=annual"
```

## FT Configuration API Examples

### 1. Get All FT Configurations

```bash
# Get all FT configurations
curl -X GET "http://localhost:3001/api/ft-config"

# Get FT configurations for specific year
curl -X GET "http://localhost:3001/api/ft-config?year=2024"

# Get FT configurations by name
curl -X GET "http://localhost:3001/api/ft-config?name=FT Rate 1"

# Get FT configurations with pagination
curl -X GET "http://localhost:3001/api/ft-config?limit=10&offset=0"
```

### 2. Get FT Configuration by ID

```bash
curl -X GET "http://localhost:3001/api/ft-config/1"
```

### 3. Create New FT Configuration

```bash
curl -X POST "http://localhost:3001/api/ft-config" \
  -H "Content-Type: application/json" \
  -d '{
    "year": 2024,
    "name": "FT Rate 4",
    "value": 0.1500,
    "unit": "Baht/Unit",
    "description": "อัตราค่าไฟฟ้าพิเศษ",
    "start_month": "Jan",
    "end_month": "Dec",
    "start_day": 1,
    "end_day": 31,
    "created_by": "admin"
  }'
```

### 4. Update FT Configuration

```bash
curl -X PUT "http://localhost:3001/api/ft-config/1" \
  -H "Content-Type: application/json" \
  -d '{
    "value": 0.2000,
    "description": "อัตราค่าไฟฟ้าพิเศษ (แก้ไข)",
    "updated_by": "admin"
  }'
```

### 5. Delete FT Configuration

```bash
curl -X DELETE "http://localhost:3001/api/ft-config/1" \
  -H "Content-Type: application/json" \
  -d '{
    "deleted_by": "admin"
  }'
```

### 6. Get FT Configurations by Year

```bash
curl -X GET "http://localhost:3001/api/ft-config/year/2024"
```

### 7. Get FT Configurations by Year Range

```bash
curl -X GET "http://localhost:3001/api/ft-config/year-range/2023/2025"
```

### 8. Bulk Create FT Configurations

```bash
curl -X POST "http://localhost:3001/api/ft-config/bulk/2024" \
  -H "Content-Type: application/json" \
  -d '{
    "configurations": [
      {
        "year": 2024,
        "name": "FT Rate 1",
        "value": 0.1000,
        "unit": "Baht/Unit",
        "description": "อัตราค่าไฟฟ้าฐาน",
        "start_month": "Jan",
        "end_month": "Dec",
        "start_day": 1,
        "end_day": 31
      },
      {
        "year": 2024,
        "name": "FT Rate 2",
        "value": 0.2000,
        "unit": "Baht/Unit",
        "description": "อัตราค่าไฟฟ้าปรับ",
        "start_month": "Jan",
        "end_month": "Dec",
        "start_day": 1,
        "end_day": 31
      }
    ],
    "created_by": "admin"
  }'
```

## JavaScript/TypeScript Examples

### Using Fetch API

```javascript
// Get holidays for current year
async function getCurrentYearHolidays() {
  const currentYear = new Date().getFullYear();
  const response = await fetch(`/api/holiday?year=${currentYear}`);
  const data = await response.json();
  return data;
}

// Create new holiday
async function createHoliday(holidayData) {
  const response = await fetch('/api/holiday', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(holidayData)
  });
  const data = await response.json();
  return data;
}

// Get FT configurations for current year
async function getCurrentYearFTConfigs() {
  const currentYear = new Date().getFullYear();
  const response = await fetch(`/api/ft-config?year=${currentYear}`);
  const data = await response.json();
  return data;
}

// Create new FT configuration
async function createFTConfig(configData) {
  const response = await fetch('/api/ft-config', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(configData)
  });
  const data = await response.json();
  return data;
}
```

### Using Axios

```javascript
import axios from 'axios';

// Get holidays for current year
async function getCurrentYearHolidays() {
  const currentYear = new Date().getFullYear();
  const response = await axios.get(`/api/holiday?year=${currentYear}`);
  return response.data;
}

// Create new holiday
async function createHoliday(holidayData) {
  const response = await axios.post('/api/holiday', holidayData);
  return response.data;
}

// Get FT configurations for current year
async function getCurrentYearFTConfigs() {
  const currentYear = new Date().getFullYear();
  const response = await axios.get(`/api/ft-config?year=${currentYear}`);
  return response.data;
}

// Create new FT configuration
async function createFTConfig(configData) {
  const response = await axios.post('/api/ft-config', configData);
  return response.data;
}
```

## Response Examples

### Holiday Response

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "date": "2024-01-01",
      "name_th": "วันขึ้นปีใหม่",
      "name_en": "New Year's Day",
      "type": "national",
      "category": "annual",
      "is_weekend": false,
      "year": 2024,
      "month": 1,
      "day": 1,
      "is_active": true,
      "created_by": "system",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_by": null,
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 1
}
```

### FT Configuration Response

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "year": 2024,
      "name": "FT Rate 1",
      "value": "0.0000",
      "unit": "Baht/Unit",
      "description": "อัตราค่าไฟฟ้าฐาน",
      "start_month": "Jan",
      "end_month": "Dec",
      "start_day": 1,
      "end_day": 31,
      "is_active": true,
      "created_by": "system",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_by": null,
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 1
}
```

### Error Response

```json
{
  "success": false,
  "message": "Missing required fields: date, name_th, name_en, type, category"
}
```

## Testing with Postman

### 1. Import Collection

Create a new collection in Postman and add the following requests:

**Get Holidays:**
- Method: GET
- URL: `{{baseUrl}}/api/holiday?year=2024`

**Create Holiday:**
- Method: POST
- URL: `{{baseUrl}}/api/holiday`
- Headers: `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "date": "2024-12-25",
  "name_th": "วันคริสต์มาส",
  "name_en": "Christmas Day",
  "type": "observance",
  "category": "special",
  "created_by": "admin"
}
```

**Get FT Configurations:**
- Method: GET
- URL: `{{baseUrl}}/api/ft-config?year=2024`

**Create FT Configuration:**
- Method: POST
- URL: `{{baseUrl}}/api/ft-config`
- Headers: `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "year": 2024,
  "name": "FT Rate 4",
  "value": 0.1500,
  "unit": "Baht/Unit",
  "description": "อัตราค่าไฟฟ้าพิเศษ",
  "created_by": "admin"
}
```

### 2. Environment Variables

Set up environment variables in Postman:
- `baseUrl`: `http://localhost:3001`

## Testing with cURL

### Test Script

```bash
#!/bin/bash

BASE_URL="http://localhost:3001"

echo "Testing Holiday API..."
echo "======================"

# Test get holidays
echo "1. Getting holidays for 2024..."
curl -s -X GET "$BASE_URL/api/holiday?year=2024" | jq '.'

# Test create holiday
echo -e "\n2. Creating new holiday..."
curl -s -X POST "$BASE_URL/api/holiday" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2024-12-25",
    "name_th": "วันคริสต์มาส",
    "name_en": "Christmas Day",
    "type": "observance",
    "category": "special",
    "created_by": "test"
  }' | jq '.'

echo -e "\nTesting FT Configuration API..."
echo "================================="

# Test get FT configurations
echo "1. Getting FT configurations for 2024..."
curl -s -X GET "$BASE_URL/api/ft-config?year=2024" | jq '.'

# Test create FT configuration
echo -e "\n2. Creating new FT configuration..."
curl -s -X POST "$BASE_URL/api/ft-config" \
  -H "Content-Type: application/json" \
  -d '{
    "year": 2024,
    "name": "FT Rate 4",
    "value": 0.1500,
    "unit": "Baht/Unit",
    "description": "อัตราค่าไฟฟ้าพิเศษ",
    "created_by": "test"
  }' | jq '.'

echo -e "\nAPI testing completed!"
```

Save this as `test_api.sh` and run:
```bash
chmod +x test_api.sh
./test_api.sh
```
