// Test script เพื่อตรวจสอบ permissions API
const jwt = require('jsonwebtoken');

// Test JWT token parsing (same logic as frontend)
function parseJWT(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(Buffer.from(base64, 'base64').toString());
    return payload;
  } catch (error) {
    console.error('❌ Error parsing JWT:', error);
    return null;
  }
}

// Test permissions API call
async function testPermissions(token) {
  try {
    const fetch = (await import('node-fetch')).default;
    
    console.log('🔍 Testing permissions API...');
    console.log('📝 Token length:', token?.length);
    
    if (token) {
      const payload = parseJWT(token);
      console.log('🔍 JWT Payload:', payload);
    }
    
    const response = await fetch('http://localhost:3001/api/permissions/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log('📊 API Response:', {
      status: response.status,
      success: data.success,
      user: data.data?.user,
      permissionsCount: Object.keys(data.data?.permissions || {}).length,
      isAdmin: data.data?.isAdmin
    });
    
    if (data.data?.permissions) {
      console.log('🔑 Available modules:', Object.keys(data.data.permissions));
    }
    
  } catch (error) {
    console.error('❌ API Test Error:', error.message);
  }
}

// Main test function
async function main() {
  console.log('🧪 === PERMISSIONS API TEST ===\n');
  
  // Test with sample JWT token (you need to get this from browser localStorage)
  const sampleToken = process.argv[2];
  
  if (!sampleToken) {
    console.log('❌ Please provide a JWT token as argument:');
    console.log('   node test-permissions.js "your-jwt-token-here"');
    console.log('\n💡 To get token:');
    console.log('   1. Login to the app');
    console.log('   2. Open browser console');
    console.log('   3. Run: localStorage.getItem("authToken")');
    console.log('   4. Copy the token and run this script');
    return;
  }
  
  await testPermissions(sampleToken);
}

main().catch(console.error);
