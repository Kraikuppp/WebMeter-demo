/**
 * Test script to debug role assignment issue
 * 
 * ปัญหา: User Jakkrit ถูกสร้างและตั้งเป็น role "Test" แต่เมื่อ login กลับได้ role "guest"
 * 
 * การตรวจสอบที่ต้องทำ:
 * 1. ตรวจสอบข้อมูล user ในฐานข้อมูล
 * 2. ตรวจสอบ role_id และ role_name
 * 3. ตรวจสอบ API response
 * 4. ตรวจสอบ localStorage
 */

console.log('🧪 === ROLE DEBUG TEST SCRIPT ===');

// Test queries to run in database
const testQueries = [
  {
    name: 'Check User Jakkrit',
    query: `
      SELECT 
        u.id,
        u.username,
        u.email,
        u.name,
        u.surname,
        u.level,
        u.status,
        u.role_id,
        r.role_name,
        r.id as role_table_id
      FROM users.users u
      LEFT JOIN users.roles r ON u.role_id = r.id
      WHERE u.username = 'Jakkrit' OR u.name = 'Jakkrit';
    `,
    description: 'ตรวจสอบข้อมูล user Jakkrit ในฐานข้อมูล'
  },
  {
    name: 'Check All Roles',
    query: `
      SELECT 
        id,
        role_name,
        created_at,
        updated_at
      FROM users.roles
      ORDER BY id;
    `,
    description: 'ตรวจสอบ roles ทั้งหมดในระบบ'
  },
  {
    name: 'Check Role Permissions for Test Role',
    query: `
      SELECT 
        rp.role_id,
        r.role_name,
        rp.module,
        rp.read_permission,
        rp.write_permission,
        rp.report_permission
      FROM users.role_permissions rp
      JOIN users.roles r ON rp.role_id = r.id
      WHERE r.role_name = 'Test'
      ORDER BY rp.module;
    `,
    description: 'ตรวจสอบ permissions ของ role Test'
  },
  {
    name: 'Check Users with Roles',
    query: `
      SELECT 
        u.username,
        u.name,
        u.level,
        u.role_id,
        r.role_name,
        u.status,
        u.created_at
      FROM users.users u
      LEFT JOIN users.roles r ON u.role_id = r.id
      WHERE u.status = 'active'
      ORDER BY u.created_at DESC;
    `,
    description: 'ตรวจสอบ users ทั้งหมดพร้อม roles'
  }
];

console.log('📋 Database Queries to Run:');
testQueries.forEach((test, index) => {
  console.log(`\n${index + 1}. ${test.name}`);
  console.log(`   Description: ${test.description}`);
  console.log(`   Query:`);
  console.log(test.query);
});

console.log('\n🔍 Steps to Debug:');
console.log('1. Run the database queries above');
console.log('2. Check if user Jakkrit exists and has correct role_id');
console.log('3. Check if role "Test" exists with correct id');
console.log('4. Check if role_id matches between user and role tables');

console.log('\n🔧 Expected Results:');
console.log('- User Jakkrit should have role_id = 5 (or whatever Test role id is)');
console.log('- Role "Test" should exist in users.roles table');
console.log('- JOIN should return role_name = "Test" for user Jakkrit');

console.log('\n🚨 Common Issues:');
console.log('1. role_id is NULL in users table');
console.log('2. role_id points to non-existent role');
console.log('3. Role name mismatch');
console.log('4. User level vs role confusion');

console.log('\n🔍 Frontend Debug Steps:');
console.log('1. Open Developer Console (F12)');
console.log('2. Login with user Jakkrit');
console.log('3. Look for these debug logs:');
console.log('   - "🔍 === LOGIN SUCCESS DEBUG ==="');
console.log('   - "📝 User data from database:"');
console.log('   - "🔑 JWT Token payload:"');
console.log('   - "✅ Login successful:"');
console.log('   - "- Server role: [role_name]"');
console.log('   - "- Stored role: [stored_role]"');

console.log('\n📱 Check localStorage:');
console.log('- userUsername: should be "Jakkrit"');
console.log('- userRole: should be "Test"');
console.log('- userLevel: should be user level');
console.log('- isGuest: should be "false"');

console.log('\n🔧 If Role is Still Wrong:');
console.log('1. Check if role_id is correctly set in database');
console.log('2. Check if LEFT JOIN is working correctly');
console.log('3. Check if API is sending correct role in response');
console.log('4. Check if frontend is storing correct role');
console.log('5. Clear browser localStorage and try again');

console.log('\n💡 Quick Fix Commands:');
console.log('-- Update user role_id manually:');
console.log("UPDATE users.users SET role_id = (SELECT id FROM users.roles WHERE role_name = 'Test') WHERE username = 'Jakkrit';");

console.log('\n-- Verify the update:');
console.log(`
SELECT 
  u.username,
  u.role_id,
  r.role_name
FROM users.users u
LEFT JOIN users.roles r ON u.role_id = r.id
WHERE u.username = 'Jakkrit';
`);

console.log('\n=== END ROLE DEBUG TEST ===');
