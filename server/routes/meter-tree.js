const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticateToken } = require('../middleware/auth');

// สร้าง connection pool สำหรับ parameters_db (meter tree data)
const parametersPool = new Pool({
  host: process.env.PARAMETER_DB_HOST || 'dpg-d3f1hphr0fns73d4ts0g-a.singapore-postgres.render.com',
  port: process.env.PARAMETER_DB_PORT || 5432,
  database: process.env.PARAMETER_DB_NAME || 'parameters_db',
  user: process.env.PARAMETER_DB_USER || 'webmeter_db_user',
  password: process.env.PARAMETER_DB_PASSWORD || 'daWOGvyNuUBHDDRtwv8sLxisuHrwdnoL',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  // SSL configuration for Render PostgreSQL
  ssl: {
    rejectUnauthorized: false,
    require: true
  }
});

// Test connection
parametersPool.on('connect', () => {
  console.log('✅ Connected to parameters_db database for meter-tree API');
});

parametersPool.on('error', (err) => {
  console.error('❌ Unexpected error on parameters_db client', err);
});

// ===== LOCATIONS =====

// Get all locations with hierarchical structure
router.get('/locations', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 === LOCATIONS API CALLED ===');
    console.log('📝 Query params:', req.query);
    
    const { tree_type } = req.query;
    let query = `
      SELECT 
        l1.id,
        l1.name,
        l1.description,
        l1.parent_id,
        l1.tree_type,
        l1.created_at,
        l1.updated_at,
        l2.name as parent_name
      FROM locations l1
      LEFT JOIN locations l2 ON l1.parent_id = l2.id
    `;
    let params = [];
    
    if (tree_type) {
      query += ' WHERE l1.tree_type = $1';
      params.push(tree_type);
    }
    
    query += ' ORDER BY l1.parent_id NULLS FIRST, l1.name';
    
    console.log('📊 Executing query:', query);
    console.log('📋 Query params:', params);
    
    const result = await parametersPool.query(query, params);
    
    console.log('✅ Query result count:', result.rows.length);
    if (result.rows.length > 0) {
      console.log('📍 Sample locations:', result.rows.slice(0, 3).map(r => ({ id: r.id, name: r.name, tree_type: r.tree_type })));
    } else {
      console.log('❌ No locations found in database');
    }
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// Create new location
router.post('/locations', async (req, res) => {
  try {
    const { name, description, parent_id, tree_type = 'system', location_floor_id } = req.body;
    console.log('🔧 Backend: Creating location with data:', {
      name,
      description,
      parent_id,
      tree_type,
      location_floor_id
    });
    
    const result = await parametersPool.query(
      'INSERT INTO locations (name, description, parent_id, tree_type, location_floor_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, description, parent_id || null, tree_type, location_floor_id]
    );
    
    console.log('✅ Backend: Location created successfully:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Backend: Error creating location:', error);
    res.status(500).json({ error: 'Failed to create location' });
  }
});

// Update location
router.put('/locations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, location_floor_id } = req.body;
    const result = await parametersPool.query(
      'UPDATE locations SET name = $1, description = $2, location_floor_id = $3 WHERE id = $4 RETURNING *',
      [name, description, location_floor_id, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// Delete location
router.delete('/locations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { tree_type } = req.query;
    console.log('🗑️ Backend: Deleting location with ID:', id, 'Tree Type:', tree_type);
    
    let query = 'DELETE FROM locations WHERE id = $1';
    let params = [id];
    
    // ถ้ามี tree_type ให้ filter ตาม tree_type ด้วย
    if (tree_type) {
      query += ' AND tree_type = $2';
      params.push(tree_type);
    }
    
    query += ' RETURNING *';
    
    const result = await parametersPool.query(query, params);
    
    if (result.rows.length === 0) {
      console.log('❌ Backend: Location not found for deletion or tree_type mismatch');
      return res.status(404).json({ error: 'Location not found' });
    }
    
    console.log('✅ Backend: Location deleted successfully:', result.rows[0]);
    res.json({ message: 'Location deleted successfully' });
  } catch (error) {
    console.error('❌ Backend: Error deleting location:', error);
    res.status(500).json({ error: 'Failed to delete location' });
  }
});

// ===== LOGNETS =====

// Get all lognets with location references
router.get('/lognets', async (req, res) => {
  try {
    const { location_id, sublocation_id } = req.query;
    let query = `
      SELECT 
        l.*,
        loc1.name as main_location_name,
        loc2.name as sub_location_name
      FROM lognets l
      LEFT JOIN locations loc1 ON l.location_id = loc1.id
      LEFT JOIN locations loc2 ON l.sublocation_id = loc2.id
    `;
    let params = [];
    let whereConditions = [];
    
    if (location_id) {
      whereConditions.push(`l.location_id = $${params.length + 1}`);
      params.push(location_id);
    }
    
    if (sublocation_id) {
      whereConditions.push(`l.sublocation_id = $${params.length + 1}`);
      params.push(sublocation_id);
    }
    
    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }
    
    query += ' ORDER BY l.name';
    const result = await parametersPool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching lognets:', error);
    res.status(500).json({ error: 'Failed to fetch lognets' });
  }
});

// Create new lognet
router.post('/lognets', async (req, res) => {
  try {
    const {
      location_id,
      sublocation_id,
      name,
      model,
      brand,
      serial_number,
      firmware_version,
      ip_address,
      subnet_mask,
      gateway,
      dns,
      is_active
    } = req.body;
    
    // แปลง empty string เป็น NULL สำหรับ IP address fields
    const cleanIpAddress = ip_address === '' ? null : ip_address;
    const cleanSubnetMask = subnet_mask === '' ? null : subnet_mask;
    const cleanGateway = gateway === '' ? null : gateway;
    const cleanDns = dns === '' ? null : dns;
    const cleanIsActive = is_active !== undefined ? is_active : true;
    
    const result = await parametersPool.query(
      `INSERT INTO lognets (
        location_id, sublocation_id, name, model, brand, serial_number, 
        firmware_version, ip_address, subnet_mask, gateway, dns, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [location_id, sublocation_id, name, model, brand, serial_number, 
       firmware_version, cleanIpAddress, cleanSubnetMask, cleanGateway, cleanDns, cleanIsActive]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating lognet:', error);
    res.status(500).json({ error: 'Failed to create lognet' });
  }
});

// Update lognet
router.put('/lognets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      location_id,
      sublocation_id,
      name,
      model,
      brand,
      serial_number,
      firmware_version,
      ip_address,
      subnet_mask,
      gateway,
      dns,
      is_active
    } = req.body;
    
    // แปลง empty string เป็น NULL สำหรับ IP address fields
    const cleanIpAddress = ip_address === '' ? null : ip_address;
    const cleanSubnetMask = subnet_mask === '' ? null : subnet_mask;
    const cleanGateway = gateway === '' ? null : gateway;
    const cleanDns = dns === '' ? null : dns;
    
    const result = await parametersPool.query(
      `UPDATE lognets SET 
        location_id = $1, sublocation_id = $2, name = $3, model = $4, 
        brand = $5, serial_number = $6, firmware_version = $7, ip_address = $8,
        subnet_mask = $9, gateway = $10, dns = $11, is_active = $12
       WHERE id = $13 RETURNING *`,
      [location_id, sublocation_id, name, model, brand, serial_number,
       firmware_version, cleanIpAddress, cleanSubnetMask, cleanGateway, cleanDns, is_active, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'LogNet not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating lognet:', error);
    res.status(500).json({ error: 'Failed to update lognet' });
  }
});

// Delete lognet
router.delete('/lognets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ Backend: Deleting lognet with ID:', id);
    
    const result = await parametersPool.query(
      'DELETE FROM lognets WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      console.log('❌ Backend: LogNet not found for deletion');
      return res.status(404).json({ error: 'LogNet not found' });
    }
    
    console.log('✅ Backend: LogNet deleted successfully:', result.rows[0]);
    res.json({ message: 'LogNet deleted successfully' });
  } catch (error) {
    console.error('❌ Backend: Error deleting lognet:', error);
    res.status(500).json({ error: 'Failed to delete lognet' });
  }
});

// ===== BUILDINGS =====

// Get all buildings
router.get('/buildings', async (req, res) => {
  try {
    const { location_id } = req.query;
    let query = 'SELECT * FROM buildings';
    let params = [];
    
    if (location_id) {
      query += ' WHERE location_id = $1';
      params.push(location_id);
    }
    
    query += ' ORDER BY name';
    const result = await parametersPool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching buildings:', error);
    res.status(500).json({ error: 'Failed to fetch buildings' });
  }
});

// Create new building
router.post('/buildings', async (req, res) => {
  try {
    const { location_id, name, description, is_active } = req.body;
    const result = await parametersPool.query(
      'INSERT INTO buildings (location_id, name, description, is_active) VALUES ($1, $2, $3, $4) RETURNING *',
      [location_id, name, description, is_active ?? true]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating building:', error);
    res.status(500).json({ error: 'Failed to create building' });
  }
});

// Update building
router.put('/buildings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { location_id, name, description, is_active } = req.body;
    const result = await parametersPool.query(
      'UPDATE buildings SET location_id = $1, name = $2, description = $3, is_active = $4 WHERE id = $5 RETURNING *',
      [location_id, name, description, is_active, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Building not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating building:', error);
    res.status(500).json({ error: 'Failed to update building' });
  }
});

// Delete building
router.delete('/buildings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await parametersPool.query(
      'DELETE FROM buildings WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Building not found' });
    }
    res.json({ message: 'Building deleted successfully' });
  } catch (error) {
    console.error('Error deleting building:', error);
    res.status(500).json({ error: 'Failed to delete building' });
  }
});

// ===== FLOORS =====

// Get all floors
router.get('/floors', async (req, res) => {
  try {
    const { building_id } = req.query;
    let query = 'SELECT * FROM floors';
    let params = [];
    
    if (building_id) {
      query += ' WHERE building_id = $1';
      params.push(building_id);
    }
    
    query += ' ORDER BY floor_number, name';
    const result = await parametersPool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching floors:', error);
    res.status(500).json({ error: 'Failed to fetch floors' });
  }
});

// Create new floor
router.post('/floors', async (req, res) => {
  try {
    const { building_id, name, floor_number, description, is_active, floor_location_id } = req.body;
    const result = await parametersPool.query(
      'INSERT INTO floors (building_id, name, floor_number, description, is_active, floor_location_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [building_id, name, floor_number, description, is_active ?? true, floor_location_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating floor:', error);
    res.status(500).json({ error: 'Failed to create floor' });
  }
});

// Update floor
router.put('/floors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { building_id, name, floor_number, description, is_active, floor_location_id } = req.body;
    const result = await parametersPool.query(
      'UPDATE floors SET building_id = $1, name = $2, floor_number = $3, description = $4, is_active = $5, floor_location_id = $6 WHERE id = $7 RETURNING *',
      [building_id, name, floor_number, description, is_active, floor_location_id, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Floor not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating floor:', error);
    res.status(500).json({ error: 'Failed to update floor' });
  }
});

// Delete floor
router.delete('/floors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await parametersPool.query(
      'DELETE FROM floors WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Floor not found' });
    }
    res.json({ message: 'Floor deleted successfully' });
  } catch (error) {
    console.error('Error deleting floor:', error);
    res.status(500).json({ error: 'Failed to delete floor' });
  }
});

// ===== METERS =====

// Get all meters
router.get('/meters', async (req, res) => {
  try {
    console.log('🔍 === METERS API CALLED ===');
    console.log('📝 Query params:', req.query);
    
    const { lognet_id, floor_id } = req.query;
    let query = 'SELECT * FROM meters';
    let params = [];
    let paramCount = 0;
    
    if (lognet_id) {
      query += ` WHERE lognet_id = $${++paramCount}`;
      params.push(lognet_id);
    } else if (floor_id) {
      query += ` WHERE floor_id = $${++paramCount}`;
      params.push(floor_id);
    }
    
    query += ' ORDER BY id';
    
    console.log('📊 Executing query:', query);
    console.log('📋 Query params:', params);
    
    const result = await parametersPool.query(query, params);
    
    console.log('✅ Query result count:', result.rows.length);
    if (result.rows.length > 0) {
      console.log('🔌 Sample meters:', result.rows.slice(0, 3).map(r => ({ id: r.id, name: r.name, brand: r.brand, slave_id: r.slave_id })));
    } else {
      console.log('❌ No meters found in database');
    }
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching meters:', error);
    res.status(500).json({ error: 'Failed to fetch meters' });
  }
});

// Create new meter
router.post('/meters', async (req, res) => {
  try {
    const {
      name,
      brand,
      model,
      meter_sn,
      protocol,
      ip_address,
      slave_id,
      port,
      budrate,
      ct_primary,
      pt_primary,
      ct_secondary,
      pt_secondary,
      is_active,
      lognet_id,
      floor_id,
      is_disabled_in_building
    } = req.body;
    
    // แปลง empty string เป็น NULL สำหรับ IP address
    const cleanIpAddress = ip_address === '' ? null : ip_address;
    
    // แปลง budrate เป็น integer และใช้ default value 9600 ถ้าไม่ใช่ตัวเลข
    const cleanBudrate = budrate && !isNaN(parseInt(budrate)) ? parseInt(budrate) : 9600;
    
    // แปลง port เป็น integer และใช้ default value 502 ถ้าไม่ใช่ตัวเลข
    const cleanPort = port && !isNaN(parseInt(port)) ? parseInt(port) : 502;
    
    // แปลง slave_id เป็น integer และใช้ default value 1 ถ้าไม่ใช่ตัวเลข
    const cleanSlaveId = slave_id && !isNaN(parseInt(slave_id)) ? parseInt(slave_id) : 1;
    
    console.log('📊 Creating meter with cleaned values:');
    console.log('  - budrate:', budrate, '→', cleanBudrate);
    console.log('  - port:', port, '→', cleanPort);
    console.log('  - slave_id:', slave_id, '→', cleanSlaveId);
    
    const result = await parametersPool.query(
      `INSERT INTO meters (
        name, brand, model, meter_sn, protocol, ip_address, slave_id, port, budrate,
        ct_primary, pt_primary, ct_secondary, pt_secondary, is_active,
        lognet_id, floor_id, is_disabled_in_building
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING *`,
      [name, brand, model, meter_sn, protocol, cleanIpAddress, cleanSlaveId, cleanPort, cleanBudrate,
       ct_primary, pt_primary, ct_secondary, pt_secondary, is_active ?? true,
       lognet_id, floor_id, is_disabled_in_building ?? false]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating meter:', error);
    res.status(500).json({ error: 'Failed to create meter' });
  }
});

// Update meter
router.put('/meters/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // สร้าง dynamic query สำหรับอัปเดตเฉพาะ field ที่ส่งมา
    const fields = [];
    const values = [];
    let paramCount = 0;
    
    // ตรวจสอบและเพิ่ม field ที่ต้องการอัปเดต
    if (updateData.name !== undefined) {
      fields.push(`name = $${++paramCount}`);
      values.push(updateData.name);
    }
    if (updateData.brand !== undefined) {
      fields.push(`brand = $${++paramCount}`);
      values.push(updateData.brand);
    }
    if (updateData.model !== undefined) {
      fields.push(`model = $${++paramCount}`);
      values.push(updateData.model);
    }
    if (updateData.meter_sn !== undefined) {
      fields.push(`meter_sn = $${++paramCount}`);
      values.push(updateData.meter_sn);
    }
    if (updateData.protocol !== undefined) {
      fields.push(`protocol = $${++paramCount}`);
      values.push(updateData.protocol);
    }
    if (updateData.ip_address !== undefined) {
      const cleanIpAddress = updateData.ip_address === '' ? null : updateData.ip_address;
      fields.push(`ip_address = $${++paramCount}`);
      values.push(cleanIpAddress);
    }
    if (updateData.slave_id !== undefined) {
      fields.push(`slave_id = $${++paramCount}`);
      // แปลง slave_id เป็น integer และใช้ default value 1 ถ้าไม่ใช่ตัวเลข
      const cleanSlaveId = updateData.slave_id && !isNaN(parseInt(updateData.slave_id)) ? parseInt(updateData.slave_id) : 1;
      values.push(cleanSlaveId);
      console.log('📊 Updating meter with slave_id:', updateData.slave_id, '→ cleaned:', cleanSlaveId);
    }
    if (updateData.port !== undefined) {
      fields.push(`port = $${++paramCount}`);
      // แปลง port เป็น integer และใช้ default value 502 ถ้าไม่ใช่ตัวเลข
      const cleanPort = updateData.port && !isNaN(parseInt(updateData.port)) ? parseInt(updateData.port) : 502;
      values.push(cleanPort);
      console.log('📊 Updating meter with port:', updateData.port, '→ cleaned:', cleanPort);
    }
    if (updateData.budrate !== undefined) {
      fields.push(`budrate = $${++paramCount}`);
      // แปลง budrate เป็น integer และใช้ default value 9600 ถ้าไม่ใช่ตัวเลข
      const cleanBudrate = updateData.budrate && !isNaN(parseInt(updateData.budrate)) ? parseInt(updateData.budrate) : 9600;
      values.push(cleanBudrate);
      console.log('📊 Updating meter with budrate:', updateData.budrate, '→ cleaned:', cleanBudrate);
    }
    if (updateData.ct_primary !== undefined) {
      fields.push(`ct_primary = $${++paramCount}`);
      values.push(updateData.ct_primary);
    }
    if (updateData.pt_primary !== undefined) {
      fields.push(`pt_primary = $${++paramCount}`);
      values.push(updateData.pt_primary);
    }
    if (updateData.ct_secondary !== undefined) {
      fields.push(`ct_secondary = $${++paramCount}`);
      values.push(updateData.ct_secondary);
    }
    if (updateData.pt_secondary !== undefined) {
      fields.push(`pt_secondary = $${++paramCount}`);
      values.push(updateData.pt_secondary);
    }
    if (updateData.is_active !== undefined) {
      fields.push(`is_active = $${++paramCount}`);
      values.push(updateData.is_active);
    }
    if (updateData.lognet_id !== undefined) {
      fields.push(`lognet_id = $${++paramCount}`);
      values.push(updateData.lognet_id);
    }
    if (updateData.floor_id !== undefined) {
      fields.push(`floor_id = $${++paramCount}`);
      values.push(updateData.floor_id);
    }
    if (updateData.is_disabled_in_building !== undefined) {
      fields.push(`is_disabled_in_building = $${++paramCount}`);
      values.push(updateData.is_disabled_in_building);
    }
    
    // ถ้าไม่มี field ที่ต้องการอัปเดต
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    // เพิ่ม id เป็น parameter สุดท้าย
    values.push(id);
    
    const query = `UPDATE meters SET ${fields.join(', ')} WHERE id = $${++paramCount} RETURNING *`;
    console.log('🔧 Update meter query:', query);
    console.log('📋 Update meter values:', values);
    
    const result = await parametersPool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Meter not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating meter:', error);
    res.status(500).json({ error: 'Failed to update meter' });
  }
});

// Delete meter
router.delete('/meters/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await parametersPool.query(
      'DELETE FROM meters WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Meter not found' });
    }
    res.json({ message: 'Meter deleted successfully' });
  } catch (error) {
    console.error('Error deleting meter:', error);
    res.status(500).json({ error: 'Failed to delete meter' });
  }
});

// ===== TREE BUILDING ENDPOINTS =====

// Get complete system tree (Location -> LogNet -> Meter)
router.get('/tree/system', async (req, res) => {
  try {
         const [locations, lognets, meters] = await Promise.all([
       db.query('SELECT * FROM locations ORDER BY name'),
       db.query('SELECT * FROM lognets WHERE is_active = true ORDER BY name'),
       db.query('SELECT * FROM meters WHERE is_active = true ORDER BY id')
     ]);

    const tree = locations.rows.map(location => ({
      id: `location-${location.id}`,
      name: location.name,
      iconType: 'location',
      children: lognets.rows
        .filter(lognet => lognet.location_id === location.id)
        .map(lognet => ({
          id: `lognet-${lognet.id}`,
          name: lognet.name,
          iconType: 'lognet',
          brand: lognet.brand,
          model: lognet.model,
          serialNumber: lognet.serial_number,
          firmwareVersion: lognet.firmware_version,
          ip: lognet.ip_address,
          subnetMask: lognet.subnet_mask,
          gateway: lognet.gateway,
          dns: lognet.dns,
          children: meters.rows
            .filter(meter => meter.lognet_id === lognet.id)
            .map(meter => ({
              id: `meter-${meter.id}`,
              name: meter.name,
              iconType: 'meter',
              enabled: meter.is_active,
              onlineEnabled: !meter.is_disabled_in_building,
              brand: meter.brand,
              model: meter.model,
              meter_sn: meter.meter_sn,
              protocol: meter.protocol,
              ip: meter.ip_address,
              port: meter.port?.toString(),
              ct_primary: meter.ct_primary?.toString(),
              ct_secondary: meter.ct_secondary?.toString(),
              pt_primary: meter.pt_primary?.toString(),
              pt_secondary: meter.pt_secondary?.toString(),
              children: []
            }))
        }))
    }));

    res.json(tree);
  } catch (error) {
    console.error('Error building system tree:', error);
    res.status(500).json({ error: 'Failed to build system tree' });
  }
});

// Get complete building tree (Location -> Building -> Floor -> Meter)
router.get('/tree/building', async (req, res) => {
  try {
         const [locations, buildings, floors, meters] = await Promise.all([
       db.query('SELECT * FROM locations ORDER BY name'),
       db.query('SELECT * FROM buildings WHERE is_active = true ORDER BY name'),
       db.query('SELECT * FROM floors WHERE is_active = true ORDER BY floor_number, name'),
       db.query('SELECT * FROM meters WHERE is_active = true ORDER BY id')
     ]);

    const tree = locations.rows.map(location => ({
      id: `location-${location.id}`,
      name: location.name,
      iconType: 'location',
      children: buildings.rows
        .filter(building => building.location_id === location.id)
        .map(building => ({
          id: `building-${building.id}`,
          name: building.name,
          iconType: 'building',
          children: floors.rows
            .filter(floor => floor.building_id === building.id)
            .map(floor => ({
              id: `floor-${floor.id}`,
              name: floor.name,
              iconType: 'floor',
              children: meters.rows
                .filter(meter => meter.floor_id === floor.id)
                .map(meter => ({
                  id: `meter-${meter.id}`,
                  name: meter.name,
                  iconType: 'meter',
                  enabled: meter.is_active,
                  onlineEnabled: !meter.is_disabled_in_building,
                  brand: meter.brand,
                  model: meter.model,
                  meter_sn: meter.meter_sn,
                  protocol: meter.protocol,
                  ip: meter.ip_address,
                  port: meter.port?.toString(),
                  ct_primary: meter.ct_primary?.toString(),
                  ct_secondary: meter.ct_secondary?.toString(),
                  pt_primary: meter.pt_primary?.toString(),
                  pt_secondary: meter.pt_secondary?.toString(),
                  children: []
                }))
            }))
        }))
    }));

    res.json(tree);
  } catch (error) {
    console.error('Error building building tree:', error);
    res.status(500).json({ error: 'Failed to build building tree' });
  }
});

// Get online tree (filtered building tree - only enabled meters)
router.get('/tree/online', async (req, res) => {
  try {
         const [locations, buildings, floors, meters] = await Promise.all([
       db.query('SELECT * FROM locations ORDER BY name'),
       db.query('SELECT * FROM buildings WHERE is_active = true ORDER BY name'),
       db.query('SELECT * FROM floors WHERE is_active = true ORDER BY floor_number, name'),
       db.query('SELECT * FROM meters WHERE is_active = true AND is_disabled_in_building = false ORDER BY id')
     ]);

    const tree = locations.rows.map(location => ({
      id: `location-${location.id}`,
      name: location.name,
      iconType: 'location',
      children: buildings.rows
        .filter(building => building.location_id === location.id)
        .map(building => ({
          id: `building-${building.id}`,
          name: building.name,
          iconType: 'building',
          children: floors.rows
            .filter(floor => floor.building_id === building.id)
            .map(floor => ({
              id: `floor-${floor.id}`,
              name: floor.name,
              iconType: 'floor',
              children: meters.rows
                .filter(meter => meter.floor_id === floor.id)
                .map(meter => ({
                  id: `meter-${meter.id}`,
                  name: meter.name,
                  iconType: 'meter',
                  enabled: meter.is_active,
                  onlineEnabled: !meter.is_disabled_in_building,
                  brand: meter.brand,
                  model: meter.model,
                  meter_sn: meter.meter_sn,
                  protocol: meter.protocol,
                  ip: meter.ip_address,
                  port: meter.port?.toString(),
                  ct_primary: meter.ct_primary?.toString(),
                  ct_secondary: meter.ct_secondary?.toString(),
                  pt_primary: meter.pt_primary?.toString(),
                  pt_secondary: meter.pt_secondary?.toString(),
                  children: []
                }))
            }))
        }))
    }));

    res.json(tree);
  } catch (error) {
    console.error('Error building online tree:', error);
    res.status(500).json({ error: 'Failed to build online tree' });
  }
});

// ===== FAVORITE METERS =====

// Get user's favorite meters
router.get('/favorites', async (req, res) => {
  try {
    const { user_id = 1, tree_type } = req.query; // Default to user_id = 1 for now
    
    let query = `
      SELECT 
        fm.id,
        fm.user_id,
        fm.meter_id,
        fm.tree_type,
        fm.created_at,
        m.name as meter_name,
        m.brand,
        m.model,
        m.meter_sn
      FROM user_favorite_meters fm
      JOIN meters m ON fm.meter_id = m.id
      WHERE fm.user_id = $1
    `;
    let params = [user_id];
    
    if (tree_type) {
      query += ' AND fm.tree_type = $2';
      params.push(tree_type);
    }
    
    query += ' ORDER BY fm.created_at DESC';
    
    const result = await parametersPool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching favorite meters:', error);
    res.status(500).json({ error: 'Failed to fetch favorite meters' });
  }
});

// Add meter to favorites
router.post('/favorites', async (req, res) => {
  try {
    const { user_id = 1, meter_id, tree_type } = req.body; // Default to user_id = 1 for now
    
    // Check if meter exists
    const meterCheck = await parametersPool.query('SELECT id, name FROM meters WHERE id = $1', [meter_id]);
    if (meterCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Meter not found' });
    }
    
    // Check if already in favorites
    const existingCheck = await parametersPool.query(
      'SELECT id FROM user_favorite_meters WHERE user_id = $1 AND meter_id = $2 AND tree_type = $3',
      [user_id, meter_id, tree_type]
    );
    
    if (existingCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Meter already in favorites' });
    }
    
    // Add to favorites
    const result = await parametersPool.query(
      'INSERT INTO user_favorite_meters (user_id, meter_id, tree_type) VALUES ($1, $2, $3) RETURNING *',
      [user_id, meter_id, tree_type]
    );
    
    console.log('✅ Added meter to favorites:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding meter to favorites:', error);
    res.status(500).json({ error: 'Failed to add meter to favorites' });
  }
});

// Remove meter from favorites
router.delete('/favorites/:meter_id', async (req, res) => {
  try {
    const { meter_id } = req.params;
    const { user_id = 1, tree_type } = req.query; // Default to user_id = 1 for now
    
    const result = await parametersPool.query(
      'DELETE FROM user_favorite_meters WHERE user_id = $1 AND meter_id = $2 AND tree_type = $3 RETURNING *',
      [user_id, meter_id, tree_type]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Favorite meter not found' });
    }
    
    console.log('✅ Removed meter from favorites:', result.rows[0]);
    res.json({ message: 'Meter removed from favorites' });
  } catch (error) {
    console.error('Error removing meter from favorites:', error);
    res.status(500).json({ error: 'Failed to remove meter from favorites' });
  }
});

// Toggle favorite status
router.post('/favorites/toggle', async (req, res) => {
  try {
    const { user_id = 1, meter_id, tree_type } = req.body; // Default to user_id = 1 for now
    
    // Check if meter exists
    const meterCheck = await parametersPool.query('SELECT id, name FROM meters WHERE id = $1', [meter_id]);
    if (meterCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Meter not found' });
    }
    
    // Check if already in favorites
    const existingCheck = await parametersPool.query(
      'SELECT id FROM user_favorite_meters WHERE user_id = $1 AND meter_id = $2 AND tree_type = $3',
      [user_id, meter_id, tree_type]
    );
    
    if (existingCheck.rows.length > 0) {
      // Remove from favorites
      await parametersPool.query(
        'DELETE FROM user_favorite_meters WHERE user_id = $1 AND meter_id = $2 AND tree_type = $3',
        [user_id, meter_id, tree_type]
      );
      
      console.log('✅ Removed meter from favorites');
      res.json({ 
        action: 'removed',
        message: 'Meter removed from favorites',
        meter_name: meterCheck.rows[0].name
      });
    } else {
      // Add to favorites
      const result = await parametersPool.query(
        'INSERT INTO user_favorite_meters (user_id, meter_id, tree_type) VALUES ($1, $2, $3) RETURNING *',
        [user_id, meter_id, tree_type]
      );
      
      console.log('✅ Added meter to favorites:', result.rows[0]);
      res.json({ 
        action: 'added',
        message: 'Meter added to favorites',
        meter_name: meterCheck.rows[0].name
      });
    }
  } catch (error) {
    console.error('Error toggling favorite status:', error);
    res.status(500).json({ error: 'Failed to toggle favorite status' });
  }
});

// ===== EXPORT SCHEDULER SUPPORT =====

// Get available meters for export scheduler (meter ID to slave_id mapping)
router.get('/available-meters', async (req, res) => {
  try {
    console.log('🔍 Export Scheduler: Fetching available meters for ID mapping...');
    
    // Get all active meters with their locations for export scheduler
    const query = `
      SELECT 
        m.id,
        CONCAT('meter-', m.id) as meter_id,
        m.name,
        m.slave_id,
        m.brand,
        m.model,
        m.is_active,
        COALESCE(
          CONCAT(
            COALESCE(l1.name, ''), 
            CASE WHEN b.name IS NOT NULL THEN CONCAT(' > ', b.name) ELSE '' END,
            CASE WHEN f.name IS NOT NULL THEN CONCAT(' > ', f.name) ELSE '' END
          ),
          COALESCE(l2.name, 'Unknown Location')
        ) as location
      FROM meters m
      LEFT JOIN floors f ON m.floor_id = f.id
      LEFT JOIN buildings b ON f.building_id = b.id
      LEFT JOIN locations l1 ON b.location_id = l1.id
      LEFT JOIN lognets ln ON m.lognet_id = ln.id
      LEFT JOIN locations l2 ON ln.location_id = l2.id
      WHERE m.is_active = true
      ORDER BY m.id
    `;
    
    const result = await parametersPool.query(query);
    
    // Format data for export scheduler
    const meters = result.rows.map(row => ({
      id: `meter-${row.id}`,
      name: row.name,
      slave_id: row.slave_id,
      location: row.location,
      brand: row.brand,
      model: row.model,
      is_active: row.is_active
    }));
    
    console.log(`🔍 Export Scheduler: Found ${meters.length} available meters`);
    console.log(`🔍 Sample meters:`, meters.slice(0, 3));
    
    res.json({
      success: true,
      data: {
        meters: meters,
        count: meters.length
      }
    });
  } catch (error) {
    console.error('❌ Export Scheduler: Error fetching available meters:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch available meters' 
    });
  }
});

// ===== BULK OPERATIONS =====

// Import tree data
router.post('/import-tree', async (req, res) => {
  try {
    const { systemTree, buildingTree } = req.body;
    
    // This is a simplified import - in a real implementation,
    // you would want to handle conflicts, validation, etc.
    console.log('Importing tree data:', { systemTree, buildingTree });
    
    res.json({ message: 'Import completed successfully' });
  } catch (error) {
    console.error('Error importing tree data:', error);
    res.status(500).json({ error: 'Failed to import tree data' });
  }
});

// Export tree data
router.get('/export-tree', async (req, res) => {
  try {
    const [systemTree, buildingTree] = await Promise.all([
      db.query('SELECT * FROM locations ORDER BY name'),
      db.query('SELECT * FROM buildings ORDER BY name')
    ]);
    
    const exportData = {
      locations: systemTree.rows,
      buildings: buildingTree.rows,
      exportDate: new Date().toISOString()
    };
    
    res.json(exportData);
  } catch (error) {
    console.error('Error exporting tree data:', error);
    res.status(500).json({ error: 'Failed to export tree data' });
  }
});

module.exports = router;
