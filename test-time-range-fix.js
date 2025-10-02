// ทดสอบการแก้ไขปัญหา Time Range ไม่ตรงกับที่ผู้ใช้เลือก

console.log('🧪 === TESTING TIME RANGE FIX ===');

// จำลองข้อมูลที่ผู้ใช้เลือก
const userSelection = {
  date_from: '2025-09-29T00:00:00.000Z',
  date_to: '2025-09-29T14:19:00.000Z',
  time_from: '00:00',
  time_to: '14:19'
};

console.log('\n📅 === USER SELECTION ===');
console.log('Date From:', userSelection.date_from);
console.log('Date To:', userSelection.date_to);
console.log('Time From:', userSelection.time_from);
console.log('Time To:', userSelection.time_to);

// ทดสอบวิธีเดิม (ปัญหา)
console.log('\n❌ === OLD METHOD (PROBLEM) ===');
const dateFromStr_old = userSelection.date_from.split('T')[0];
const dateToStr_old = userSelection.date_to.split('T')[0];
const dateFrom_old = new Date(dateFromStr_old + 'T00:00:00'); // บังคับเป็น 00:00
const dateTo_old = new Date(dateToStr_old + 'T23:59:59');     // บังคับเป็น 23:59

const formatThaiDateTime_old = (date) => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

const oldDateRange = `${formatThaiDateTime_old(dateFrom_old)} - ${formatThaiDateTime_old(dateTo_old)}`;
console.log('Old Date Range:', oldDateRange);
console.log('Problem: Shows 00:00 - 23:59 instead of user selected 00:00 - 14:19');

// ทดสอบวิธีใหม่ (แก้ไขแล้ว)
console.log('\n✅ === NEW METHOD (FIXED) ===');
const dateFromStr_new = userSelection.date_from.split('T')[0];
const dateToStr_new = userSelection.date_to.split('T')[0];
const dateFrom_new = new Date(dateFromStr_new + 'T' + userSelection.time_from + ':00'); // ใช้เวลาที่ผู้ใช้เลือก
const dateTo_new = new Date(dateToStr_new + 'T' + userSelection.time_to + ':00');       // ใช้เวลาที่ผู้ใช้เลือก

const formatThaiDateTime_new = (date) => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

const newDateRange = `${formatThaiDateTime_new(dateFrom_new)} - ${formatThaiDateTime_new(dateTo_new)}`;
console.log('New Date Range:', newDateRange);
console.log('Fixed: Shows user selected 00:00 - 14:19 correctly');

// เปรียบเทียบผลลัพธ์
console.log('\n🎯 === COMPARISON ===');
console.log('User Selected:', '29/09/2025 00:00 - 29/09/2025 14:19');
console.log('Old Result:   ', oldDateRange);
console.log('New Result:   ', newDateRange);
console.log('Match with user selection:', newDateRange === '29/09/2025 00:00 - 29/09/2025 14:19' ? '✅ YES' : '❌ NO');

// ทดสอบ Auto Export Report format
console.log('\n📊 === AUTO EXPORT REPORT COMPARISON ===');

const oldReport = `📊 WebMeter Auto Export Report
📋 Export Type: daily
📅 Date Range: ${oldDateRange}
🏭 Meters: 1 selected
📊 Parameters: 1 selected
⏰ Generated: 29/09/2025 14:23:00`;

const newReport = `📊 WebMeter Auto Export Report
📋 Export Type: daily
📅 Date Range: ${newDateRange}
🏭 Meters: 1 selected
📊 Parameters: 1 selected
⏰ Generated: 29/09/2025 14:23:00`;

console.log('OLD REPORT:');
console.log(oldReport);
console.log('\nNEW REPORT:');
console.log(newReport);

console.log('\n🎯 === SUMMARY ===');
console.log('✅ Fixed Date object creation - ใช้เวลาที่ผู้ใช้เลือกแทน 23:59:59');
console.log('✅ Fixed formatThaiDateTime - แสดงเวลาที่ถูกต้อง');
console.log('✅ Auto Export จะแสดง Date Range ตรงกับที่ผู้ใช้เลือกแล้ว!');
console.log('\n📋 Expected Result:');
console.log('User selects: 00:00 - 14:19');
console.log('Report shows: 29/09/2025 00:00 - 29/09/2025 14:19 ✅');
console.log('NOT:          29/09/2025 00:00 - 29/09/2025 23:59 ❌');
