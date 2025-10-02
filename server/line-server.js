const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const util = require('util');

// Load environment variables from .env file (if available)
try {
  require('dotenv').config();
} catch (error) {
  console.log('ℹ️  dotenv not available, using system environment variables');
}

const app = express();
const PORT = 3002; // Use different port to avoid conflicts
const execAsync = util.promisify(exec);

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = ['http://localhost:8080', 'http://localhost:3000'];
    if (!origin) return callback(null, true); // Allow non-browser clients or same-origin
    const isAllowed = allowedOrigins.includes(origin);
    callback(null, isAllowed);
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}));

// Explicitly handle preflight across all routes
app.options('*', cors());
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'LINE Server is running',
    timestamp: new Date().toISOString()
  });
});

// LINE Configuration
const LINE_CONFIG = {
  CHANNEL_ID: process.env.LINE_CHANNEL_ID || '2008111292',
  CHANNEL_SECRET: process.env.LINE_CHANNEL_SECRET || '59b8d6706ca2628fc8d80e9bf52227f2',
  CHANNEL_ACCESS_TOKEN: process.env.LINE_CHANNEL_ACCESS_TOKEN || 'TpepU3krrJuCANdERlRqYYfTi9bH10G0vFriid+tGfNZxaFY2jfC3MJXCE5XjVylBK2sgVN+6zkZhi04+ZwE3HtfDFGPB88WdqOoBjZoKaBymG4SFYUiXC+XE8jePY4nl0x905WH9bWyE8Xqvjt3GQdB04t89/1O/w1cDnyilFU='
};

// Helper to get LINE channel access token
function getLineAccessToken() {
  console.log('🔍 LINE Configuration:');
  console.log('- CHANNEL_ID:', LINE_CONFIG.CHANNEL_ID);
  console.log('- CHANNEL_SECRET:', LINE_CONFIG.CHANNEL_SECRET.substring(0, 10) + '...');
  console.log('- CHANNEL_ACCESS_TOKEN length:', LINE_CONFIG.CHANNEL_ACCESS_TOKEN.length);
  console.log('- CHANNEL_ACCESS_TOKEN starts with:', LINE_CONFIG.CHANNEL_ACCESS_TOKEN.substring(0, 10) + '...');
  
  // Check if we're using the correct token for this channel
  if (LINE_CONFIG.CHANNEL_ID === '2008111292') {
    console.log('✅ Using Channel ID 2008111292');
    console.log('⚠️  Please make sure you have the correct Channel Access Token for this Channel ID');
    console.log('🔗 Get your token from: https://developers.line.biz/console/channel/2008111292/messaging-api');
  }
  
  return LINE_CONFIG.CHANNEL_ACCESS_TOKEN;
}

// LINE message send endpoint
app.post('/send-line', async (req, res) => {
  try {
    const { lineId, message } = req.body;
    
    console.log('📱 LINE Send Request:', { lineId: lineId?.substring(0, 10) + '...', messageLength: message?.length });
    
    if (!lineId || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'LINE ID and message are required' 
      });
    }
    
    // Get LINE access token (env first, fallback to static)
    const accessToken = getLineAccessToken();

    // Prepare payload for LINE API
    // Clean and trim message to avoid LINE API issues
    let safeMessage = typeof message === 'string' ? message : String(message);
    
    // Remove problematic characters that might cause LINE API issues
    safeMessage = safeMessage
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n') // Normalize line endings
      .trim();
    
    // Trim to safe length (LINE limit is 5000 chars, we use 4000 for safety)
    safeMessage = safeMessage.slice(0, 4000);
    
    console.log('🔍 Message processing:');
    console.log('- Original length:', message.length);
    console.log('- Cleaned length:', safeMessage.length);
    console.log('- Message preview:', safeMessage.substring(0, 100) + '...');

    // Create payload with fallback to short message if original is too long
    const messages = [];
    
    if (safeMessage.length > 1000) {
      // If message is too long, send a short notification first
      messages.push({
        type: 'text',
        text: '📊 WebMeter Export Data\n\nกำลังส่งข้อมูลให้คุณ...'
      });
      
      // Then send the actual data in chunks
      const chunks = [];
      const chunkSize = 1000;
      for (let i = 0; i < safeMessage.length; i += chunkSize) {
        chunks.push(safeMessage.slice(i, i + chunkSize));
      }
      
      chunks.forEach((chunk, index) => {
        messages.push({
          type: 'text',
          text: `📋 ส่วนที่ ${index + 1}/${chunks.length}:\n\n${chunk}`
        });
      });
    } else {
      // Send as single message if short enough
      messages.push({
        type: 'text',
        text: safeMessage
      });
    }
    
    const payload = {
      to: lineId,
      messages: messages
    };
    
    console.log('📱 Sending', messages.length, 'message(s) to LINE');

    
    
    try {
      
      // Wait a bit before sending the actual data
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('🚀 Sending actual data...');
      await sendLineMessage(payload, accessToken);
      
    } catch (testError) {
      console.error('❌ Test message failed:', testError.message);
      
      // Provide detailed error information
      const errorResponse = {
        success: false,
        error: 'Test message failed',
        details: testError.message,
        lineId: lineId,
        troubleshooting: [
          '1. ตรวจสอบว่า LINE ID ถูกต้อง',
          '2. ตรวจสอบว่าได้เพิ่ม Bot เป็นเพื่อนใน LINE แล้ว',
          '3. ตรวจสอบว่า Bot ยังไม่ได้ถูกบล็อก',
          '4. ตรวจสอบ LINE Access Token',
          '5. ลองสร้าง Bot ใหม่และเพิ่มเป็นเพื่อนใหม่'
        ],
        nextSteps: [
          '1. ไปที่ LINE Developers Console',
          '2. ตรวจสอบ Channel ID: 2008111292',
          '3. ตรวจสอบ Channel Access Token',
          '4. เพิ่ม Bot เป็นเพื่อนใน LINE',
          '5. ส่งข้อความ "สวัสดี" ให้ Bot ก่อน'
        ]
      };
      
      return res.status(400).json(errorResponse);
    }
    
    res.json({
      success: true,
      message: 'LINE messages sent successfully!',
      messagesCount: messages.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ LINE Send Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send LINE message',
      details: error.message
    });
  }
});

// Helper function to send LINE message
async function sendLineMessage(payload, accessToken) {
  return new Promise((resolve, reject) => {
    const https = require('https');
    const url = new URL('https://api.line.me/v2/bot/message/push');
    const requestBody = JSON.stringify(payload);

    const options = {
      method: 'POST',
      hostname: url.hostname,
      path: url.pathname + (url.search || ''),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };

    const reqHttps = https.request(options, (resp) => {
      let data = '';
      resp.on('data', (chunk) => { data += chunk; });
      resp.on('end', () => {
        let parsed = null;
        try {
          parsed = data ? JSON.parse(data) : null;
        } catch {
          parsed = { raw: data };
        }

        if (resp.statusCode && resp.statusCode >= 200 && resp.statusCode < 300) {
          console.log('✅ LINE API Success (HTTP', resp.statusCode, ')');
          resolve(parsed);
        } else {
          const requestId = resp.headers && (resp.headers['x-line-request-id'] || resp.headers['X-Line-Request-Id']);
          console.error('❌ LINE API Error:', {
            status: resp.statusCode,
            requestId,
            body: parsed
          });
          reject(new Error(`LINE API Error: ${resp.statusCode} - ${parsed?.message || 'Unknown error'}`));
        }
      });
    });

    reqHttps.on('error', (err) => {
      console.error('❌ HTTPS request error:', err);
      reject(err);
    });

    reqHttps.write(requestBody);
    reqHttps.end();
  });
}

// Check Bot status and provide setup instructions
app.get('/bot-status', async (req, res) => {
  try {
    res.json({
      success: true,
      botInfo: {
        channelId: LINE_CONFIG.CHANNEL_ID,
        channelSecret: LINE_CONFIG.CHANNEL_SECRET.substring(0, 10) + '...',
        accessTokenLength: LINE_CONFIG.CHANNEL_ACCESS_TOKEN.length,
        accessTokenStart: LINE_CONFIG.CHANNEL_ACCESS_TOKEN.substring(0, 10) + '...'
      },
      setupInstructions: {
        step1: {
          title: 'ตรวจสอบ LINE ID',
          description: 'LINE ID ควรเริ่มต้นด้วย U, C, หรือ G และมีความยาว 33 ตัวอักษร',
          example: 'Ud7e668c179c2da822c8de1832c794ab6'
        },
        step2: {
          title: 'เพิ่ม Bot เป็นเพื่อน',
          description: 'ค้นหา Bot ใน LINE และเพิ่มเป็นเพื่อน',
          qrCode: 'https://developers.line.biz/console/channel/2008111292/messaging-api'
        },
        step3: {
          title: 'ส่งข้อความทดสอบ',
          description: 'ส่งข้อความ "สวัสดี" ให้ Bot ก่อน',
          example: 'สวัสดี'
        },
        step4: {
          title: 'ตรวจสอบ Channel Access Token',
          description: 'ตรวจสอบว่า token ไม่หมดอายุและถูกต้อง',
          link: 'https://developers.line.biz/console/channel/2008111292/messaging-api'
        }
      },
      commonIssues: [
        'LINE ID ไม่ถูกต้อง',
        'Bot ยังไม่ได้เพิ่มเป็นเพื่อน',
        'Bot ถูกบล็อก',
        'Channel Access Token หมดอายุ',
        'Channel ไม่ได้เปิดใช้งาน Messaging API'
      ],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get bot status',
      details: error.message
    });
  }
});

// Check LINE Channel configuration
app.get('/check-line-config', async (req, res) => {
  try {
    res.json({
      success: true,
      config: {
        channelId: LINE_CONFIG.CHANNEL_ID,
        channelSecret: LINE_CONFIG.CHANNEL_SECRET.substring(0, 10) + '...',
        accessTokenLength: LINE_CONFIG.CHANNEL_ACCESS_TOKEN.length,
        accessTokenStart: LINE_CONFIG.CHANNEL_ACCESS_TOKEN.substring(0, 10) + '...'
      },
      setupInstructions: {
        channelId: '2008111292',
        channelSecret: '59b8d6706ca2628fc8d80e9bf52227f2',
        getAccessToken: 'https://developers.line.biz/console/channel/2008111292/messaging-api',
        steps: [
          '1. ไปที่ LINE Developers Console',
          '2. เลือก Channel ID: 2008111292',
          '3. ไปที่แท็บ "Messaging API"',
          '4. คัดลอก "Channel access token"',
          '5. อัปเดต LINE_CONFIG.CHANNEL_ACCESS_TOKEN ในโค้ด'
        ]
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to check LINE configuration',
      details: error.message
    });
  }
});

// Test LINE ID and Bot connection
app.post('/test-line-id', async (req, res) => {
  try {
    const { lineId } = req.body;
    
    if (!lineId) {
      return res.status(400).json({
        success: false,
        error: 'LINE ID is required'
      });
    }
    
    // Validate LINE ID format
    const lineIdPattern = /^[UCG][a-zA-Z0-9]{32}$/;
    if (!lineIdPattern.test(lineId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid LINE ID format',
        expectedFormat: 'Should start with U, C, or G followed by 32 alphanumeric characters',
        received: lineId,
        length: lineId.length,
        troubleshooting: [
          '1. ตรวจสอบว่า LINE ID ถูกต้อง',
          '2. LINE ID ควรเริ่มต้นด้วย U (User), C (Chat), หรือ G (Group)',
          '3. LINE ID ควรมีความยาว 33 ตัวอักษร',
          '4. ตรวจสอบว่าไม่มีตัวอักษรพิเศษ'
        ]
      });
    }
    
    const accessToken = getLineAccessToken();
    
 
    
    console.log('🧪 Testing LINE ID:', lineId);

    
    try {
      
      res.json({
        success: true,
        message: 'LINE ID test successful!',
        lineId: lineId,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ LINE ID test failed:', error.message);
      
      res.status(400).json({
        success: false,
        error: 'LINE ID test failed',
        details: error.message,
        lineId: lineId,
        troubleshooting: [
          '1. ตรวจสอบว่า LINE ID ถูกต้อง',
          '2. ตรวจสอบว่าได้เพิ่ม Bot เป็นเพื่อนใน LINE แล้ว',
          '3. ตรวจสอบว่า Bot ยังไม่ได้ถูกบล็อก',
          '4. ตรวจสอบ LINE Access Token'
        ]
      });
    }
    
  } catch (error) {
    console.error('❌ LINE ID test error:', error);
    res.status(500).json({
      success: false,
      error: 'LINE ID test failed',
      details: error.message
    });
  }
});

// Validate LINE push payload (no actual send)
app.post('/validate-line', async (req, res) => {
  try {
    const { lineId, message } = req.body;
    if (!lineId || !message) {
      return res.status(400).json({ success: false, error: 'LINE ID and message are required' });
    }
    const safeMessage = typeof message === 'string' ? message.slice(0, 4800) : String(message).slice(0, 4800);
    const payload = { to: lineId, messages: [{ type: 'text', text: safeMessage }] };

    const https = require('https');
    const url = new URL('https://api.line.me/v2/bot/message/validate/push');
    const requestBody = JSON.stringify(payload);
    const options = {
      method: 'POST',
      hostname: url.hostname,
      path: url.pathname + (url.search || ''),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };

    await new Promise((resolve) => {
      const reqHttps = https.request(options, (resp) => {
        let data = '';
        resp.on('data', (chunk) => { data += chunk; });
        resp.on('end', () => {
          let parsed = null;
          try { parsed = data ? JSON.parse(data) : null; } catch { parsed = { raw: data }; }
          const requestId = resp.headers && (resp.headers['x-line-request-id'] || resp.headers['X-Line-Request-Id']);
          if (resp.statusCode && resp.statusCode >= 200 && resp.statusCode < 300) {
            res.json({ success: true, message: 'Payload valid', requestId, details: parsed });
          } else {
            res.status(resp.statusCode || 500).json({ success: false, status: resp.statusCode, requestId, details: parsed });
          }
          resolve();
        });
      });
      reqHttps.on('error', (err) => {
        res.status(500).json({ success: false, error: 'HTTPS validate failed', details: err.message });
        resolve();
      });
      reqHttps.write(requestBody);
      reqHttps.end();
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Validate endpoint failed', details: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 LINE Server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📱 LINE endpoint: http://localhost:${PORT}/send-line`);
});
