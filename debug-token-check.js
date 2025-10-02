// Debug script - รันใน Browser Console
console.log('🔍 === TOKEN DIAGNOSTIC ===');

// 1. ตรวจสอบ localStorage
console.log('📦 localStorage contents:');
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  const value = localStorage.getItem(key);
  console.log(`  ${key}:`, value?.substring(0, 50) + '...');
}

// 2. ตรวจสอบ sessionStorage
console.log('📦 sessionStorage contents:');
for (let i = 0; i < sessionStorage.length; i++) {
  const key = sessionStorage.key(i);
  const value = sessionStorage.getItem(key);
  console.log(`  ${key}:`, value?.substring(0, 50) + '...');
}

// 3. ตรวจสอบ cookies
console.log('🍪 Cookies:', document.cookie);

// 4. ตรวจสอบ current URL
console.log('🌐 Current URL:', window.location.href);

// 5. ตรวจสอบ user data ใน localStorage
const userData = localStorage.getItem('user');
console.log('👤 User data:', userData ? JSON.parse(userData) : 'Not found');

// 6. ทดสอบ API call
const token = localStorage.getItem('authToken');
if (token) {
  console.log('🔑 Testing API with token...');
  fetch('http://localhost:3001/api/permissions/me', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  .then(res => {
    console.log('📡 API Response status:', res.status);
    return res.json();
  })
  .then(data => {
    console.log('📡 API Response data:', data);
  })
  .catch(error => {
    console.error('❌ API Error:', error);
  });
} else {
  console.log('❌ No token found in localStorage');
}
