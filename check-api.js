// Simple API check without external dependencies
const http = require('http');

function checkAPI() {
  console.log('🔍 Checking if API is available...');
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/meter-tree/available-meters',
    method: 'GET',
    timeout: 5000
  };
  
  const req = http.request(options, (res) => {
    console.log(`📊 API Response: ${res.statusCode} ${res.statusMessage}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        console.log('✅ API is working!');
        console.log(`📊 Found ${jsonData.data?.count || 0} meters`);
        
        if (jsonData.data?.meters) {
          const meter114 = jsonData.data.meters.find(m => m.id === 'meter-114');
          if (meter114) {
            console.log(`🎯 meter-114 found: slave_id = ${meter114.slave_id}`);
            if (meter114.slave_id === 10) {
              console.log('✅ meter-114 correctly mapped to slave_id: 10');
            } else {
              console.log(`❌ meter-114 has wrong slave_id: ${meter114.slave_id}`);
            }
          } else {
            console.log('❌ meter-114 not found');
          }
        }
      } catch (e) {
        console.log('❌ Failed to parse JSON response');
        console.log('Raw response:', data.substring(0, 200));
      }
    });
  });
  
  req.on('error', (err) => {
    console.log('❌ API not available:', err.message);
    console.log('💡 Make sure the server is running with: npm run dev');
  });
  
  req.on('timeout', () => {
    console.log('❌ API request timed out');
    req.destroy();
  });
  
  req.end();
}

checkAPI();
