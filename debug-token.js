// Debug script สำหรับตรวจสอบ JWT token
// รันใน Browser Console

console.log('🔍 === TOKEN DEBUG ===');

// 1. ตรวจสอบ token ใน localStorage
const token = localStorage.getItem('authToken');
console.log('📝 Token exists:', !!token);
console.log('📝 Token length:', token?.length);

if (token) {
  try {
    // 2. Parse JWT payload
    const parts = token.split('.');
    console.log('📝 JWT parts:', parts.length);
    
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      console.log('📝 JWT Payload:', payload);
      
      // 3. ตรวจสอบ expiration
      const now = Math.floor(Date.now() / 1000);
      const exp = payload.exp;
      console.log('📝 Current time:', now);
      console.log('📝 Token expires:', exp);
      console.log('📝 Token expired:', now > exp);
      console.log('📝 Time remaining:', exp - now, 'seconds');
      
      // 4. ตรวจสอบ user data
      console.log('📝 User ID:', payload.userId);
      console.log('📝 Username:', payload.username);
      console.log('📝 Role:', payload.role);
    }
  } catch (error) {
    console.error('❌ Error parsing token:', error);
  }
}

// 5. ทดสอบ API call
if (token) {
  fetch('http://localhost:3001/api/permissions/me', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  .then(res => {
    console.log('📝 API Response Status:', res.status);
    return res.json();
  })
  .then(data => {
    console.log('📝 API Response:', data);
  })
  .catch(error => {
    console.error('❌ API Error:', error);
  });
}
