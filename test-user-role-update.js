// Test script สำหรับทดสอบ API update user role

async function testUpdateUserRole() {
  try {
    console.log('🧪 Testing User Role Update API...\n');
    
    // ต้องใส่ JWT token ที่ได้จาก login
    const token = process.argv[2];
    if (!token) {
      console.log('❌ Please provide JWT token as argument:');
      console.log('   node test-user-role-update.js "your-jwt-token-here"');
      console.log('\n💡 To get token:');
      console.log('   1. Login to the app');
      console.log('   2. Open browser console');
      console.log('   3. Run: localStorage.getItem("authToken")');
      return;
    }
    
    // Test data
    const userId = 31; // Jakkrit's user ID
    const newRoleName = 'Test';
    
    console.log('📝 Test Parameters:');
    console.log('   User ID:', userId);
    console.log('   New Role:', newRoleName);
    console.log('   Token length:', token.length);
    console.log('');
    
    // Make API call
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch(`http://localhost:3001/api/users/${userId}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        roleName: newRoleName
      })
    });
    
    const data = await response.json();
    
    console.log('📊 API Response:');
    console.log('   Status:', response.status);
    console.log('   Success:', data.success);
    
    if (data.success) {
      console.log('✅ Role updated successfully!');
      console.log('   Updated User:', data.data.user);
      console.log('   Changes:', data.data.changes);
    } else {
      console.log('❌ Failed to update role:');
      console.log('   Error:', data.error);
      console.log('   Details:', data.details);
    }
    
  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
}

// Test authentication
async function testAuth() {
  try {
    const token = process.argv[2];
    if (!token) return;
    
    console.log('\n🔐 Testing Authentication...');
    
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch('http://localhost:3001/api/permissions/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    console.log('   Auth Status:', response.status);
    console.log('   Auth Success:', data.success);
    
    if (data.success) {
      console.log('   Current User:', data.data.user);
    }
    
  } catch (error) {
    console.error('❌ Auth Test Error:', error.message);
  }
}

async function main() {
  await testAuth();
  await testUpdateUserRole();
}

main().catch(console.error);
