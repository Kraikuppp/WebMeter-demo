/**
 * Debug script for permissions and localStorage issues
 * 
 * ปัญหา: Server ส่ง role "Test" แต่ Frontend ได้ role "Guest"
 * 
 * ขั้นตอนการตรวจสอบ:
 * 1. ตรวจสอบ localStorage หลัง login
 * 2. ตรวจสอบ usePermissions hook
 * 3. ตรวจสอบ Navigation component
 */

console.log('🧪 === PERMISSIONS DEBUG SCRIPT ===');

// Function to check localStorage
function checkLocalStorage() {
  console.log('\n📱 === LOCALSTORAGE STATUS ===');
  console.log('userUsername:', localStorage.getItem('userUsername'));
  console.log('userRole:', localStorage.getItem('userRole'));
  console.log('userLevel:', localStorage.getItem('userLevel'));
  console.log('isGuest:', localStorage.getItem('isGuest'));
  console.log('authToken:', localStorage.getItem('authToken') ? 'exists' : 'missing');
  console.log('googleUser:', localStorage.getItem('googleUser'));
}

// Function to manually trigger permissions refresh
function refreshPermissions() {
  console.log('\n🔄 === MANUAL PERMISSIONS REFRESH ===');
  window.dispatchEvent(new Event('userDataUpdated'));
  console.log('✅ Dispatched userDataUpdated event');
}

// Function to clear all data and reset
function resetUserData() {
  console.log('\n🗑️ === RESET USER DATA ===');
  localStorage.clear();
  console.log('✅ Cleared all localStorage');
  window.dispatchEvent(new Event('userDataUpdated'));
  console.log('✅ Dispatched userDataUpdated event');
}

// Function to manually set correct user data
function setCorrectUserData() {
  console.log('\n🔧 === SET CORRECT USER DATA ===');
  localStorage.setItem('userUsername', 'Jakkrit');
  localStorage.setItem('userRole', 'Test');
  localStorage.setItem('userLevel', 'Test');
  localStorage.setItem('isGuest', 'false');
  console.log('✅ Set correct user data');
  window.dispatchEvent(new Event('userDataUpdated'));
  console.log('✅ Dispatched userDataUpdated event');
}

// Make functions available globally for testing
window.debugPermissions = {
  checkLocalStorage,
  refreshPermissions,
  resetUserData,
  setCorrectUserData
};

console.log('\n💡 === AVAILABLE DEBUG FUNCTIONS ===');
console.log('Run these in browser console:');
console.log('- debugPermissions.checkLocalStorage()');
console.log('- debugPermissions.refreshPermissions()');
console.log('- debugPermissions.setCorrectUserData()');
console.log('- debugPermissions.resetUserData()');

console.log('\n🔍 === EXPECTED FLOW ===');
console.log('1. Login with Jakkrit');
console.log('2. Server sends: { role: "Test" }');
console.log('3. Frontend stores: userRole: "Test"');
console.log('4. usePermissions reads: { role: "Test" }');
console.log('5. Navigation shows: userRole: "Test"');

console.log('\n🚨 === CURRENT ISSUE ===');
console.log('- Server: ✅ role: "Test"');
console.log('- localStorage: ? (need to check)');
console.log('- usePermissions: ❌ role: "Guest"');
console.log('- Navigation: ❌ userRole: "Guest"');

console.log('\n🔧 === DEBUGGING STEPS ===');
console.log('1. Login with Jakkrit');
console.log('2. Run: debugPermissions.checkLocalStorage()');
console.log('3. Check if userRole is "Test" in localStorage');
console.log('4. If not, there\'s an issue with Login.tsx');
console.log('5. If yes, there\'s an issue with usePermissions hook');
console.log('6. Run: debugPermissions.refreshPermissions()');
console.log('7. Check Navigation Debug again');

// Auto-check localStorage on load
setTimeout(() => {
  console.log('\n🔄 === AUTO CHECK ON LOAD ===');
  checkLocalStorage();
}, 1000);

console.log('\n=== END DEBUG SCRIPT ===');
