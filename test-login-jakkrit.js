/**
 * Test script to debug Jakkrit login issue
 * 
 * ปัญหา: User Jakkrit login แล้วได้ role "guest" แทนที่จะเป็น "Test"
 * 
 * จากรูปภาพ:
 * - User: Jakkrit
 * - Email: jakkrit.2520@gmail.com  
 * - Level: Test
 * - Active: ✅
 * 
 * แต่เมื่อ login ได้ role "guest"
 */

const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  host: '192.168.1.175',
  user: 'webmeter_app',
  password: 'Amptron@2024',
  database: 'webmeter_db',
  port: 5432,
});

async function testJakkritLogin() {
  console.log('🧪 === TESTING JAKKRIT LOGIN ISSUE ===');
  
  try {
    // 1. Check user data directly
    console.log('\n1. 🔍 Checking user data in database:');
    const userQuery = `
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
      WHERE LOWER(u.username) = LOWER('Jakkrit') 
         OR LOWER(u.email) = LOWER('jakkrit.2520@gmail.com')
         OR LOWER(u.name) = LOWER('Jakkrit');
    `;
    
    const userResult = await pool.query(userQuery);
    console.log('📊 User query results:', userResult.rows);
    
    if (userResult.rows.length === 0) {
      console.log('❌ No user found!');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('\n📝 User details:');
    console.log('- ID:', user.id);
    console.log('- Username:', user.username);
    console.log('- Email:', user.email);
    console.log('- Name:', user.name);
    console.log('- Level:', user.level);
    console.log('- Status:', user.status);
    console.log('- Role ID:', user.role_id);
    console.log('- Role Name:', user.role_name);
    
    // 2. Check roles table
    console.log('\n2. 🔍 Checking roles table:');
    const rolesQuery = `SELECT id, role_name FROM users.roles ORDER BY id`;
    const rolesResult = await pool.query(rolesQuery);
    console.log('📊 Available roles:', rolesResult.rows);
    
    // 3. Check if role_id matches
    console.log('\n3. 🔍 Role ID Analysis:');
    if (user.role_id === null) {
      console.log('❌ Problem: role_id is NULL');
      console.log('💡 Solution: Need to set role_id for user');
      
      // Find Test role ID
      const testRole = rolesResult.rows.find(r => r.role_name === 'Test');
      if (testRole) {
        console.log(`💡 Test role ID is: ${testRole.id}`);
        console.log(`💡 Run this SQL to fix:`);
        console.log(`UPDATE users.users SET role_id = ${testRole.id} WHERE id = ${user.id};`);
      }
    } else {
      console.log('✅ role_id is set:', user.role_id);
      if (user.role_name) {
        console.log('✅ role_name is:', user.role_name);
      } else {
        console.log('❌ role_name is NULL - JOIN failed');
      }
    }
    
    // 4. Test the exact query used by login API
    console.log('\n4. 🔍 Testing login API query:');
    const loginQuery = `
      SELECT 
        u.id,
        u.username,
        u.email,
        u.password_hash,
        u.name,
        u.surname,
        u.level,
        u.status,
        u.failed_login_attempts,
        u.locked_until,
        u.role_id,
        r.role_name
      FROM users.users u
      LEFT JOIN users.roles r ON u.role_id = r.id
      WHERE LOWER(u.username) = LOWER($1) OR LOWER(u.email) = LOWER($1)
    `;
    
    const loginResult = await pool.query(loginQuery, ['Jakkrit']);
    console.log('📊 Login API query results:', loginResult.rows.length, 'users found');
    
    if (loginResult.rows.length > 0) {
      const loginUser = loginResult.rows[0];
      console.log('📝 Login API would get:');
      console.log('- Username:', loginUser.username);
      console.log('- Level:', loginUser.level);
      console.log('- Role ID:', loginUser.role_id);
      console.log('- Role Name:', loginUser.role_name);
      console.log('- Status:', loginUser.status);
      
      // This is what should be sent to frontend
      console.log('\n📤 API Response should contain:');
      console.log('- user.username:', loginUser.username);
      console.log('- user.level:', loginUser.level);
      console.log('- user.role:', loginUser.role_name);
    }
    
    // 5. Check password hash (just verify it exists)
    console.log('\n5. 🔍 Password verification:');
    if (user.password_hash) {
      console.log('✅ Password hash exists');
    } else {
      console.log('❌ No password hash - user cannot login');
    }
    
  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
testJakkritLogin().then(() => {
  console.log('\n🏁 Test completed');
}).catch(error => {
  console.error('❌ Test failed:', error);
});

console.log('\n💡 Expected Results:');
console.log('- User should have role_id pointing to Test role');
console.log('- role_name should be "Test" from JOIN');
console.log('- API should send role: "Test" to frontend');
console.log('- Frontend should store userRole: "Test"');

console.log('\n🔧 If role_id is NULL, run this SQL:');
console.log('UPDATE users.users SET role_id = (SELECT id FROM users.roles WHERE role_name = \'Test\') WHERE username = \'Jakkrit\';');
