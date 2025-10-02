// Debug utility to check user data in localStorage
export function debugUserData() {
  console.log('🔍 === USER DEBUG INFO ===');
  
  // Check all possible user-related localStorage keys
  const keys = [
    'userUsername',
    'userEmail', 
    'auth_token',
    'authToken',
    'isGuest',
    'rememberMe'
  ];
  
  keys.forEach(key => {
    const value = localStorage.getItem(key);
    console.log(`📝 ${key}:`, value);
  });
  
  // Try to decode JWT tokens
  const tokens = ['auth_token', 'authToken'];
  tokens.forEach(tokenKey => {
    const token = localStorage.getItem(tokenKey);
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1] || ''));
        console.log(`🔓 Decoded ${tokenKey}:`, payload);
      } catch (error) {
        console.log(`❌ Failed to decode ${tokenKey}:`, error);
      }
    }
  });
  
  console.log('🔍 === END USER DEBUG ===');
}

// Function to get current user (same logic as Event Logger)
export function getCurrentUserDebug(): string {
  try {
    // ใช้วิธีเดียวกับ navigation แต่แยก username และ level ให้ชัดเจน
    const token = localStorage.getItem('auth_token');
    let username = localStorage.getItem('userUsername') || localStorage.getItem('userEmail') || '';
    let actualUsername = username; // เก็บ username จริงไว้ก่อน
    
    console.log('🔍 Debug getCurrentUser:');
    console.log('📝 Initial userUsername:', localStorage.getItem('userUsername'));
    console.log('📝 Initial userEmail:', localStorage.getItem('userEmail'));
    
    // ลองดึงจาก JWT token ถ้ามี
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1] || ''));
        console.log('🔓 Token payload:', payload);
        
        // แยกระหว่าง username จริงกับ level
        console.log('🔍 Checking payload fields:');
        console.log('  - payload.username:', payload.username);
        console.log('  - payload.displayName:', payload.displayName);
        console.log('  - payload.name:', payload.name);
        console.log('  - payload.email:', payload.email);
        console.log('  - payload.level:', payload.level);
        
        // ใช้ลำดับความสำคัญ: username > displayName > name > email
        if (payload.username) {
          actualUsername = payload.username;
          console.log('✅ Using payload.username:', actualUsername);
        } else if (payload.displayName) {
          actualUsername = payload.displayName;
          console.log('✅ Using payload.displayName:', actualUsername);
        } else if (payload.name && !['guest', 'operator', 'admin', 'manager', 'supervisor', 'engineer'].includes(payload.name.toLowerCase())) {
          // ใช้ payload.name เฉพาะเมื่อไม่ใช่ level
          actualUsername = payload.name;
          console.log('✅ Using payload.name (not a level):', actualUsername);
        } else if (payload.name) {
          // ถ้า payload.name เป็น level แต่ไม่มี username อื่น ให้ใช้ name ก่อน
          actualUsername = payload.name;
          console.log('✅ Using payload.name (might be username):', actualUsername);
        } else if (payload.email) {
          actualUsername = payload.email;
          console.log('✅ Using payload.email:', actualUsername);
        } else {
          console.log('⚠️ No suitable username field found in payload');
        }
      } catch (decodeError) {
        console.error('❌ Error decoding token:', decodeError);
      }
    }
    
    // ถ้ายังไม่มี username ลองหาจาก authToken
    if (!actualUsername || actualUsername === 'null' || actualUsername === 'undefined') {
      console.log('⚠️ No username from auth_token, trying authToken...');
      const authToken = localStorage.getItem('authToken');
      if (authToken) {
        try {
          const payload = JSON.parse(atob(authToken.split('.')[1] || ''));
          console.log('🔓 AuthToken payload:', payload);
          actualUsername = payload.username || payload.displayName || payload.email || '';
          console.log('✅ Using username from authToken:', actualUsername);
        } catch (decodeError) {
          console.error('❌ Error decoding authToken:', decodeError);
        }
      }
    }
    
    // ถ้ามี username ให้ใช้ (ไม่ override เป็น guest)
    if (actualUsername && actualUsername !== 'null' && actualUsername !== 'undefined') {
      console.log('✅ Final username:', actualUsername);
      return actualUsername;
    }
    
    // เฉพาะเมื่อไม่มี username จริงเลย ถึงจะใช้ 'guest'
    const isGuest = localStorage.getItem('isGuest');
    if (isGuest === 'true') {
      console.log('👤 Guest user detected (no real username found)');
      return 'guest';
    }
    
  } catch (error) {
    console.error('❌ Error getting current user:', error);
  }
  
  console.log('⚠️ No user found, using anonymous');
  return 'anonymous';
}

// Export to window for easy debugging in console
if (typeof window !== 'undefined') {
  (window as any).debugUserData = debugUserData;
  (window as any).getCurrentUserDebug = getCurrentUserDebug;
}
