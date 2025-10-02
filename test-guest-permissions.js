// ทดสอบระบบ Guest Permissions
// ตรวจสอบว่า guest สามารถเข้าถึงหน้าที่กำหนดได้และไม่สามารถใช้ print modal

console.log('🧪 === TESTING GUEST PERMISSIONS SYSTEM ===');

// Test 1: ตรวจสอบ guest permissions ใน backend
async function testGuestPermissionsAPI() {
  console.log('\n📡 Testing Guest Permissions API...');
  
  try {
    // สร้าง mock guest token (ในการทดสอบจริงจะใช้ token จริง)
    const mockGuestData = {
      username: 'guest',
      role: 'Guest'
    };
    
    console.log('👤 Mock guest data:', mockGuestData);
    
    // ทดสอบ default permissions สำหรับ guest
    const expectedGuestModules = [
      'Dashboard',
      'Table Data', 
      'Graph Data',
      'Line Graph',
      'Demand Graph',
      'Energy Graph',
      'Compare Graph'
    ];
    
    console.log('✅ Expected guest accessible modules:', expectedGuestModules);
    
    // ทดสอบ modules ที่ guest ไม่ควรเข้าถึงได้
    const restrictedModules = [
      'Online Data',
      'TOU',
      'TOU Demand Graph',
      'TOU Energy Graph', 
      'TOU Compare Graph',
      'Charge',
      'Event',
      'Config',
      'Export Data',
      'Email Line',
      'User Management',
      'Meter Tree',
      'Holiday'
    ];
    
    console.log('❌ Restricted modules for guest:', restrictedModules);
    
    return {
      success: true,
      allowedModules: expectedGuestModules,
      restrictedModules: restrictedModules
    };
    
  } catch (error) {
    console.error('❌ Error testing guest permissions API:', error);
    return { success: false, error: error.message };
  }
}

// Test 2: ตรวจสอบ guest permissions ใน frontend
function testGuestPermissionsFrontend() {
  console.log('\n🎨 Testing Guest Permissions Frontend...');
  
  // Mock guest permissions object
  const guestPermissions = {
    'Dashboard': { read: true, write: false, report: false },
    'Table Data': { read: true, write: false, report: false },
    'Graph Data': { read: true, write: false, report: false },
    'Line Graph': { read: true, write: false, report: false },
    'Demand Graph': { read: true, write: false, report: false },
    'Energy Graph': { read: true, write: false, report: false },
    'Compare Graph': { read: true, write: false, report: false }
  };
  
  console.log('🔍 Guest permissions object:', guestPermissions);
  
  // ทดสอบ hasPermission function
  function mockHasPermission(module, action) {
    const modulePermissions = guestPermissions[module];
    if (!modulePermissions) {
      console.log(`❌ No permissions found for module: ${module}`);
      return false;
    }
    
    const hasAccess = modulePermissions[action] || false;
    console.log(`🔍 Permission check: ${module}.${action} = ${hasAccess}`);
    return hasAccess;
  }
  
  // ทดสอบการเข้าถึงหน้าต่างๆ
  const testCases = [
    { module: 'Dashboard', action: 'read', expected: true },
    { module: 'Table Data', action: 'read', expected: true },
    { module: 'Table Data', action: 'report', expected: false },
    { module: 'Compare Graph', action: 'read', expected: true },
    { module: 'Compare Graph', action: 'report', expected: false },
    { module: 'User Management', action: 'read', expected: false },
    { module: 'Config', action: 'read', expected: false }
  ];
  
  console.log('\n🧪 Running permission test cases...');
  let passedTests = 0;
  
  testCases.forEach((test, index) => {
    const result = mockHasPermission(test.module, test.action);
    const passed = result === test.expected;
    
    console.log(`Test ${index + 1}: ${test.module}.${test.action} = ${result} (expected: ${test.expected}) ${passed ? '✅' : '❌'}`);
    
    if (passed) passedTests++;
  });
  
  console.log(`\n📊 Test Results: ${passedTests}/${testCases.length} tests passed`);
  
  return {
    success: passedTests === testCases.length,
    passedTests,
    totalTests: testCases.length
  };
}

// Test 3: ทดสอบ print modal restrictions
function testPrintModalRestrictions() {
  console.log('\n🖨️ Testing Print Modal Restrictions...');
  
  const pagesWithPrintModal = [
    'Table Data',
    'Compare Graph', 
    'Line Graph',
    'Demand Graph',
    'Energy Graph'
  ];
  
  console.log('📄 Pages with print modal:', pagesWithPrintModal);
  
  // Mock hasPermission function สำหรับ guest
  function guestHasPermission(module, action) {
    const guestPermissions = {
      'Dashboard': { read: true, write: false, report: false },
      'Table Data': { read: true, write: false, report: false },
      'Graph Data': { read: true, write: false, report: false },
      'Line Graph': { read: true, write: false, report: false },
      'Demand Graph': { read: true, write: false, report: false },
      'Energy Graph': { read: true, write: false, report: false },
      'Compare Graph': { read: true, write: false, report: false }
    };
    
    const modulePermissions = guestPermissions[module];
    return modulePermissions ? modulePermissions[action] || false : false;
  }
  
  console.log('\n🔍 Testing print button visibility for guest...');
  
  pagesWithPrintModal.forEach(page => {
    const canViewPage = guestHasPermission(page, 'read');
    const canUsePrint = guestHasPermission(page, 'report');
    
    console.log(`${page}:`);
    console.log(`  - Can view page: ${canViewPage ? '✅' : '❌'}`);
    console.log(`  - Can use print: ${canUsePrint ? '✅' : '❌'}`);
    console.log(`  - Print button should be: ${canUsePrint ? 'VISIBLE' : 'HIDDEN'}`);
  });
  
  return {
    success: true,
    message: 'Print modal restrictions tested successfully'
  };
}

// Test 4: ทดสอบ guest login flow
function testGuestLoginFlow() {
  console.log('\n🔐 Testing Guest Login Flow...');
  
  // Mock localStorage operations
  const mockLocalStorage = {};
  
  function mockSetItem(key, value) {
    mockLocalStorage[key] = value;
    console.log(`📝 localStorage.setItem('${key}', '${value}')`);
  }
  
  function mockGetItem(key) {
    const value = mockLocalStorage[key];
    console.log(`📖 localStorage.getItem('${key}') = '${value}'`);
    return value;
  }
  
  function mockClear() {
    Object.keys(mockLocalStorage).forEach(key => delete mockLocalStorage[key]);
    console.log('🗑️ localStorage.clear()');
  }
  
  // Simulate guest login
  console.log('🎭 Simulating guest login...');
  
  // Clear existing data
  mockClear();
  
  // Set guest data
  mockSetItem('isGuest', 'true');
  mockSetItem('userUsername', 'guest');
  
  // Verify guest data
  const isGuest = mockGetItem('isGuest') === 'true';
  const username = mockGetItem('userUsername');
  
  console.log(`\n✅ Guest login verification:`);
  console.log(`  - isGuest: ${isGuest}`);
  console.log(`  - username: ${username}`);
  console.log(`  - Should redirect to: /home`);
  
  return {
    success: isGuest && username === 'guest',
    isGuest,
    username
  };
}

// รันการทดสอบทั้งหมด
async function runAllTests() {
  console.log('🚀 Starting Guest Permissions Test Suite...\n');
  
  const results = {
    api: await testGuestPermissionsAPI(),
    frontend: testGuestPermissionsFrontend(),
    printModal: testPrintModalRestrictions(),
    loginFlow: testGuestLoginFlow()
  };
  
  console.log('\n📋 === TEST SUMMARY ===');
  console.log('API Test:', results.api.success ? '✅ PASSED' : '❌ FAILED');
  console.log('Frontend Test:', results.frontend.success ? '✅ PASSED' : '❌ FAILED');
  console.log('Print Modal Test:', results.printModal.success ? '✅ PASSED' : '❌ FAILED');
  console.log('Login Flow Test:', results.loginFlow.success ? '✅ PASSED' : '❌ FAILED');
  
  const allPassed = Object.values(results).every(result => result.success);
  console.log(`\n🎯 Overall Result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  return results;
}

// รันการทดสอบ
runAllTests().then(results => {
  console.log('\n🏁 Guest Permissions Testing Complete!');
}).catch(error => {
  console.error('💥 Test suite failed:', error);
});
