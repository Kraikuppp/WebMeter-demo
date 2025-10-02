import * as XLSX from 'xlsx';

// Interface สำหรับข้อมูลที่อ่านจาก Excel
export interface ExcelMeterData {
  // Location/Building/Floor information
  location?: string;
  building?: string;
  floor?: string;
  
  // LogNet information (for System tree)
  lognet_name?: string;
  lognet_brand?: string;
  lognet_model?: string;
  lognet_serial?: string;
  lognet_ip?: string;
  
  // Meter information
  meter_name: string;
  meter_brand: string;
  meter_model: string;
  meter_sn?: string;
  slave_id: number;
  ip_address?: string;
  port?: number | string;
  ct_primary: number;
  ct_secondary: number;
  pt_primary: number;
  pt_secondary: number;
  baud_rate?: number;
}

export interface ParsedExcelData {
  systemTree: ExcelMeterData[];
  buildingTree: ExcelMeterData[];
  errors: string[];
}

// ฟังก์ชันอ่านไฟล์ Excel และแปลงเป็นข้อมูล tree structure
export async function parseExcelFile(file: File): Promise<ParsedExcelData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        console.log('📊 Excel workbook loaded:', workbook.SheetNames);
        
        const result: ParsedExcelData = {
          systemTree: [],
          buildingTree: [],
          errors: []
        };
        
        // อ่านแต่ละ sheet
        workbook.SheetNames.forEach(sheetName => {
          try {
            console.log(`📋 Processing sheet: ${sheetName}`);
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
            
            if (jsonData.length < 2) {
              result.errors.push(`Sheet "${sheetName}" is empty or has no data rows`);
              return;
            }
            
            // ตรวจสอบว่าเป็น System tree หรือ Building tree จาก sheet name หรือ header
            const isSystemTree = sheetName.toLowerCase().includes('system') || 
                                sheetName.toLowerCase().includes('lognet');
            const isBuildingTree = sheetName.toLowerCase().includes('building') || 
                                 sheetName.toLowerCase().includes('floor');
            
            // ถ้าไม่ระบุชัดเจน ให้ดูจาก header columns
            const headers = (jsonData[0] as string[]).map(h => h?.toLowerCase() || '');
            const hasLognetColumns = headers.some(h => h.includes('lognet'));
            const hasBuildingColumns = headers.some(h => h.includes('building') || h.includes('floor'));
            
            const targetArray = isSystemTree || (hasLognetColumns && !hasBuildingColumns) 
              ? result.systemTree 
              : result.buildingTree;
            
            console.log(`📊 Sheet "${sheetName}" detected as: ${targetArray === result.systemTree ? 'System Tree' : 'Building Tree'}`);
            
            // Parse data rows
            const parsedData = parseSheetData(jsonData, sheetName);
            targetArray.push(...parsedData.data);
            result.errors.push(...parsedData.errors);
            
          } catch (error) {
            console.error(`❌ Error processing sheet "${sheetName}":`, error);
            result.errors.push(`Error processing sheet "${sheetName}": ${error.message}`);
          }
        });
        
        console.log('✅ Excel parsing completed:', {
          systemTree: result.systemTree.length,
          buildingTree: result.buildingTree.length,
          errors: result.errors.length
        });
        
        resolve(result);
      } catch (error) {
        console.error('❌ Error parsing Excel file:', error);
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read Excel file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

// ฟังก์ชันแปลง sheet data เป็น ExcelMeterData
function parseSheetData(jsonData: any[][], sheetName: string): { data: ExcelMeterData[], errors: string[] } {
  const headers = (jsonData[0] as string[]).map(h => h?.toLowerCase()?.trim() || '');
  const data: ExcelMeterData[] = [];
  const errors: string[] = [];
  
  console.log(`📋 Headers in "${sheetName}":`, headers);
  
  // สร้าง mapping จาก header ไปยัง field names
  const headerMap = createHeaderMapping(headers);
  
  // Process data rows (skip header row)
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i] as any[];
    
    // Skip empty rows
    if (!row || row.every(cell => !cell)) continue;
    
    try {
      const meterData = parseRowData(row, headerMap, i + 1);
      if (meterData) {
        data.push(meterData);
      }
    } catch (error) {
      console.error(`❌ Error parsing row ${i + 1}:`, error);
      errors.push(`Row ${i + 1}: ${error.message}`);
    }
  }
  
  return { data, errors };
}

// สร้าง mapping จาก header names ไปยัง field names
function createHeaderMapping(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};
  
  headers.forEach((header, index) => {
    const cleanHeader = header.toLowerCase().trim();
    
    // Location/Building/Floor mappings
    if (cleanHeader.includes('location')) mapping.location = index;
    if (cleanHeader.includes('building')) mapping.building = index;
    if (cleanHeader.includes('floor')) mapping.floor = index;
    
    // LogNet mappings
    if (cleanHeader.includes('lognet') && cleanHeader.includes('name')) mapping.lognet_name = index;
    if (cleanHeader.includes('lognet') && cleanHeader.includes('brand')) mapping.lognet_brand = index;
    if (cleanHeader.includes('lognet') && cleanHeader.includes('model')) mapping.lognet_model = index;
    if (cleanHeader.includes('lognet') && cleanHeader.includes('serial')) mapping.lognet_serial = index;
    if (cleanHeader.includes('lognet') && cleanHeader.includes('ip')) mapping.lognet_ip = index;
    
    // Meter mappings
    if ((cleanHeader.includes('meter') && cleanHeader.includes('name')) || cleanHeader === 'name') mapping.meter_name = index;
    if ((cleanHeader.includes('meter') && cleanHeader.includes('brand')) || cleanHeader === 'brand') mapping.meter_brand = index;
    if ((cleanHeader.includes('meter') && cleanHeader.includes('model')) || cleanHeader === 'model') mapping.meter_model = index;
    if (cleanHeader.includes('meter') && cleanHeader.includes('sn')) mapping.meter_sn = index;
    if (cleanHeader.includes('slave') && cleanHeader.includes('id')) mapping.slave_id = index;
    if (cleanHeader.includes('ip') && !cleanHeader.includes('lognet')) mapping.ip_address = index;
    if (cleanHeader.includes('port')) mapping.port = index;
    if (cleanHeader.includes('ct') && cleanHeader.includes('primary')) mapping.ct_primary = index;
    if (cleanHeader.includes('ct') && cleanHeader.includes('secondary')) mapping.ct_secondary = index;
    if (cleanHeader.includes('pt') && cleanHeader.includes('primary')) mapping.pt_primary = index;
    if (cleanHeader.includes('pt') && cleanHeader.includes('secondary')) mapping.pt_secondary = index;
    if (cleanHeader.includes('baud')) mapping.baud_rate = index;
  });
  
  console.log('🗺️ Header mapping:', mapping);
  return mapping;
}

// แปลง row data เป็น ExcelMeterData
function parseRowData(row: any[], headerMap: Record<string, number>, rowNumber: number): ExcelMeterData | null {
  const getValue = (key: string): any => {
    const index = headerMap[key];
    return index !== undefined ? row[index] : undefined;
  };
  
  const getStringValue = (key: string): string | undefined => {
    const value = getValue(key);
    return value ? String(value).trim() : undefined;
  };
  
  const getNumberValue = (key: string): number | undefined => {
    const value = getValue(key);
    if (value === undefined || value === null || value === '') return undefined;
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  };
  
  // Required fields
  const meter_name = getStringValue('meter_name');
  const meter_brand = getStringValue('meter_brand');
  const meter_model = getStringValue('meter_model');
  const slave_id = getNumberValue('slave_id');
  const ct_primary = getNumberValue('ct_primary');
  const ct_secondary = getNumberValue('ct_secondary');
  const pt_primary = getNumberValue('pt_primary');
  const pt_secondary = getNumberValue('pt_secondary');
  
  // Validate required fields
  if (!meter_name) {
    throw new Error('Meter name is required');
  }
  if (!meter_brand) {
    throw new Error('Meter brand is required');
  }
  if (!meter_model) {
    throw new Error('Meter model is required');
  }
  if (slave_id === undefined) {
    throw new Error('Slave ID is required');
  }
  if (ct_primary === undefined) {
    throw new Error('CT Primary is required');
  }
  if (ct_secondary === undefined) {
    throw new Error('CT Secondary is required');
  }
  if (pt_primary === undefined) {
    throw new Error('PT Primary is required');
  }
  if (pt_secondary === undefined) {
    throw new Error('PT Secondary is required');
  }
  
  return {
    // Location/Building/Floor
    location: getStringValue('location'),
    building: getStringValue('building'),
    floor: getStringValue('floor'),
    
    // LogNet
    lognet_name: getStringValue('lognet_name'),
    lognet_brand: getStringValue('lognet_brand'),
    lognet_model: getStringValue('lognet_model'),
    lognet_serial: getStringValue('lognet_serial'),
    lognet_ip: getStringValue('lognet_ip'),
    
    // Meter
    meter_name,
    meter_brand,
    meter_model,
    meter_sn: getStringValue('meter_sn'),
    slave_id,
    ip_address: getStringValue('ip_address'),
    port: getStringValue('port') || 'RTU',
    ct_primary,
    ct_secondary,
    pt_primary,
    pt_secondary,
    baud_rate: (() => {
      const baudRateValue = getNumberValue('baud_rate') || 19200;
      console.log(`🔧 Parsing meter ${meter_name} - Baud Rate: ${baudRateValue}`);
      return baudRateValue;
    })()
  };
}

// ฟังก์ชันสร้าง tree structure อัตโนมัติจากข้อมูล Excel
export async function createTreeFromExcelData(
  data: ExcelMeterData[], 
  treeType: 'system' | 'building',
  meterTreeService: any
): Promise<{ success: boolean, message: string, created: any }> {
  console.log(`🌳 Creating ${treeType} tree from Excel data:`, data.length, 'meters');
  
  const created = {
    locations: 0,
    buildings: 0,
    floors: 0,
    lognets: 0,
    meters: 0
  };
  
  try {
    if (treeType === 'system') {
      return await createSystemTree(data, meterTreeService, created);
    } else {
      return await createBuildingTree(data, meterTreeService, created);
    }
  } catch (error) {
    console.error(`❌ Error creating ${treeType} tree:`, error);
    return {
      success: false,
      message: `Failed to create ${treeType} tree: ${error.message}`,
      created
    };
  }
}

// สร้าง System Tree (Location -> LogNet -> Meter)
async function createSystemTree(
  data: ExcelMeterData[], 
  meterTreeService: any, 
  created: any
): Promise<{ success: boolean, message: string, created: any }> {
  
  const locationMap = new Map<string, any>();
  const lognetMap = new Map<string, any>();
  
  // เก็บ cache ของ lognets ที่มีอยู่แล้วในฐานข้อมูล
  const existingLognetsCache = new Map<number, any[]>();
  
  for (const meterData of data) {
    // 1. Create or get Location
    const locationName = meterData.location || 'Default Location';
    let location = locationMap.get(locationName);
    
    if (!location) {
      // ตรวจสอบว่ามี location นี้อยู่แล้วในฐานข้อมูลหรือไม่
      try {
        const existingLocations = await meterTreeService.getSystemLocations();
        const existingLocation = existingLocations.find((loc: any) => 
          loc.name.toLowerCase().trim() === locationName.toLowerCase().trim()
        );
        
        if (existingLocation) {
          location = existingLocation;
          console.log(`🔍 Found existing location: ${locationName}`);
        } else {
          location = await meterTreeService.createLocation({
            name: locationName,
            description: `Location created from Excel import`,
            tree_type: 'system'
          });
          created.locations++;
          console.log(`✅ Created new location: ${locationName}`);
        }
      } catch (error) {
        // ถ้าไม่สามารถดึงข้อมูล location ที่มีอยู่ได้ ให้สร้างใหม่
        console.warn(`⚠️ Cannot check existing locations, creating new: ${locationName}`);
        location = await meterTreeService.createLocation({
          name: locationName,
          description: `Location created from Excel import`,
          tree_type: 'system'
        });
        created.locations++;
        console.log(`✅ Created location: ${locationName}`);
      }
      
      locationMap.set(locationName, location);
    }
    
    // 2. Create or get LogNet
    const lognetName = meterData.lognet_name || `LogNet-${meterData.meter_name}`;
    const lognetKey = `${location.id}-${lognetName}`;
    let lognet = lognetMap.get(lognetKey);
    
    if (!lognet) {
      console.log(`🔍 Checking for lognet: "${lognetName}" in location: "${locationName}" (ID: ${location.id})`);
      
      // ตรวจสอบว่ามี lognet นี้อยู่แล้วในฐานข้อมูลหรือไม่
      try {
        // ใช้ cache เพื่อไม่ต้องเรียก API ซ้ำสำหรับ location เดียวกัน
        let existingLognets = existingLognetsCache.get(location.id);
        if (!existingLognets) {
          existingLognets = await meterTreeService.getLogNetsByLocation(location.id);
          existingLognetsCache.set(location.id, existingLognets);
          console.log(`📊 Loaded ${existingLognets.length} existing lognets for location ${location.id}`);
        }
        
        const existingLognet = existingLognets.find((ln: any) => 
          ln.name.toLowerCase().trim() === lognetName.toLowerCase().trim()
        );
        
        if (existingLognet) {
          lognet = existingLognet;
          console.log(`🔍 Found existing lognet: "${lognetName}" (ID: ${lognet.id}) in location "${locationName}"`);
          
          // อัปเดต cache เพื่อให้ Map ใน memory sync กับฐานข้อมูล
          lognetMap.set(lognetKey, lognet);
        } else {
          console.log(`➕ Creating new lognet: "${lognetName}" in location "${locationName}"`);
          lognet = await meterTreeService.createLogNet({
            location_id: location.id,
            name: lognetName,
            brand: meterData.lognet_brand || 'Unknown',
            model: meterData.lognet_model || 'Unknown',
            serial_number: meterData.lognet_serial || '',
            ip_address: meterData.lognet_ip || '',
            is_active: true
          });
          created.lognets++;
          console.log(`✅ Created new lognet: "${lognetName}" (ID: ${lognet.id}) in location "${locationName}"`);
          
          // อัปเดต cache ทั้ง Map และ existingLognetsCache
          lognetMap.set(lognetKey, lognet);
          existingLognets.push(lognet);
          existingLognetsCache.set(location.id, existingLognets);
        }
      } catch (error) {
        // ถ้าไม่สามารถดึงข้อมูล lognet ที่มีอยู่ได้ ให้สร้างใหม่
        console.warn(`⚠️ Cannot check existing lognets, creating new: ${lognetName}`, error);
        lognet = await meterTreeService.createLogNet({
          location_id: location.id,
          name: lognetName,
          brand: meterData.lognet_brand || 'Unknown',
          model: meterData.lognet_model || 'Unknown',
          serial_number: meterData.lognet_serial || '',
          ip_address: meterData.lognet_ip || '',
          is_active: true
        });
        created.lognets++;
        console.log(`✅ Created lognet: ${lognetName}`);
        lognetMap.set(lognetKey, lognet);
      }
    } else {
      console.log(`♻️ Using cached lognet: "${lognetName}" (ID: ${lognet.id}) from Map`);
    }
    
    // 3. Create Meter
    // ตรวจสอบว่ามี meter นี้อยู่แล้วหรือไม่ (ตรวจจาก slave_id ที่ต้องไม่ซ้ำ)
    try {
      const existingMeters = await meterTreeService.getMetersByLogNet(lognet.id);
      const existingMeter = existingMeters.find((meter: any) => 
        meter.slave_id === meterData.slave_id || 
        meter.name.toLowerCase().trim() === meterData.meter_name.toLowerCase().trim()
      );
      
      if (existingMeter) {
        console.log(`🔍 Found existing meter: ${meterData.meter_name} (Slave ID: ${meterData.slave_id})`);
        console.warn(`⚠️ Skipping duplicate meter: ${meterData.meter_name}`);
      } else {
        console.log(`🔧 Creating meter with baud_rate: ${meterData.baud_rate} (sending as budrate: ${meterData.baud_rate})`);
        const meter = await meterTreeService.createMeter({
          lognet_id: lognet.id,
          name: meterData.meter_name,
          brand: meterData.meter_brand,
          model: meterData.meter_model,
          meter_sn: meterData.meter_sn || '',
          protocol: 'RTU',
          ip_address: meterData.ip_address || '',
          slave_id: meterData.slave_id,
          port: meterData.port,
          budrate: meterData.baud_rate,
          ct_primary: meterData.ct_primary,
          ct_secondary: meterData.ct_secondary,
          pt_primary: meterData.pt_primary,
          pt_secondary: meterData.pt_secondary,
          is_active: true
        });
        created.meters++;
        console.log(`✅ Created new meter: ${meterData.meter_name} (Slave ID: ${meterData.slave_id})`);
      }
    } catch (error) {
      // ถ้าไม่สามารถดึงข้อมูล meter ที่มีอยู่ได้ ให้สร้างใหม่
      console.warn(`⚠️ Cannot check existing meters, creating new: ${meterData.meter_name}`);
      const meter = await meterTreeService.createMeter({
        lognet_id: lognet.id,
        name: meterData.meter_name,
        brand: meterData.meter_brand,
        model: meterData.meter_model,
        meter_sn: meterData.meter_sn || '',
        protocol: 'RTU',
        ip_address: meterData.ip_address || '',
        slave_id: meterData.slave_id,
        port: meterData.port,
        budrate: meterData.baud_rate,
        ct_primary: meterData.ct_primary,
        ct_secondary: meterData.ct_secondary,
        pt_primary: meterData.pt_primary,
        pt_secondary: meterData.pt_secondary,
        is_active: true
      });
      created.meters++;
      console.log(`✅ Created meter: ${meterData.meter_name}`);
    }
  }
  
  return {
    success: true,
    message: `System tree created successfully: ${created.locations} locations, ${created.lognets} lognets, ${created.meters} meters`,
    created
  };
}

// สร้าง Building Tree (Location -> Building -> Floor -> Meter)
async function createBuildingTree(
  data: ExcelMeterData[], 
  meterTreeService: any, 
  created: any
): Promise<{ success: boolean, message: string, created: any }> {
  
  const locationMap = new Map<string, any>();
  const buildingMap = new Map<string, any>();
  const floorMap = new Map<string, any>();
  
  // เก็บ cache ของ buildings ที่มีอยู่แล้วในฐานข้อมูล
  const existingBuildingsCache = new Map<number, any[]>();
  
  for (const meterData of data) {
    // 1. Create or get Location
    const locationName = meterData.location || 'Default Location';
    let location = locationMap.get(locationName);
    
    if (!location) {
      // ตรวจสอบว่ามี location นี้อยู่แล้วในฐานข้อมูลหรือไม่
      try {
        const existingLocations = await meterTreeService.getBuildingLocations();
        const existingLocation = existingLocations.find((loc: any) => 
          loc.name.toLowerCase().trim() === locationName.toLowerCase().trim()
        );
        
        if (existingLocation) {
          location = existingLocation;
          console.log(`🔍 Found existing location: ${locationName}`);
        } else {
          location = await meterTreeService.createLocation({
            name: locationName,
            description: `Location created from Excel import`,
            tree_type: 'building'
          });
          created.locations++;
          console.log(`✅ Created new location: ${locationName}`);
        }
      } catch (error) {
        // ถ้าไม่สามารถดึงข้อมูล location ที่มีอยู่ได้ ให้สร้างใหม่
        console.warn(`⚠️ Cannot check existing locations, creating new: ${locationName}`);
        location = await meterTreeService.createLocation({
          name: locationName,
          description: `Location created from Excel import`,
          tree_type: 'building'
        });
        created.locations++;
        console.log(`✅ Created location: ${locationName}`);
      }
      
      locationMap.set(locationName, location);
    }
    
    // 2. Create or get Building
    const buildingName = meterData.building || 'Default Building';
    const buildingKey = `${location.id}-${buildingName}`;
    let building = buildingMap.get(buildingKey);
    
    if (!building) {
      console.log(`🔍 Checking for building: "${buildingName}" in location: "${locationName}" (ID: ${location.id})`);
      
      // ตรวจสอบว่ามี building นี้อยู่แล้วในฐานข้อมูลหรือไม่
      try {
        // ใช้ cache เพื่อไม่ต้องเรียก API ซ้ำสำหรับ location เดียวกัน
        let existingBuildings = existingBuildingsCache.get(location.id);
        if (!existingBuildings) {
          existingBuildings = await meterTreeService.getBuildingsByLocation(location.id);
          existingBuildingsCache.set(location.id, existingBuildings);
          console.log(`📊 Loaded ${existingBuildings.length} existing buildings for location ${location.id}`);
        }
        
        const existingBuilding = existingBuildings.find((bld: any) => 
          bld.name.toLowerCase().trim() === buildingName.toLowerCase().trim()
        );
        
        if (existingBuilding) {
          building = existingBuilding;
          console.log(`🔍 Found existing building: "${buildingName}" (ID: ${building.id}) in location "${locationName}"`);
          
          // อัปเดต cache เพื่อให้ Map ใน memory sync กับฐานข้อมูล
          buildingMap.set(buildingKey, building);
        } else {
          console.log(`➕ Creating new building: "${buildingName}" in location "${locationName}"`);
          building = await meterTreeService.createBuilding({
            location_id: location.id,
            name: buildingName,
            description: `Building created from Excel import`,
            is_active: true
          });
          created.buildings++;
          console.log(`✅ Created new building: "${buildingName}" (ID: ${building.id}) in location "${locationName}"`);
          
          // อัปเดต cache ทั้ง Map และ existingBuildingsCache
          buildingMap.set(buildingKey, building);
          existingBuildings.push(building);
          existingBuildingsCache.set(location.id, existingBuildings);
        }
      } catch (error) {
        // ถ้าไม่สามารถดึงข้อมูล building ที่มีอยู่ได้ ให้สร้างใหม่
        console.warn(`⚠️ Cannot check existing buildings, creating new: ${buildingName}`, error);
        building = await meterTreeService.createBuilding({
          location_id: location.id,
          name: buildingName,
          description: `Building created from Excel import`,
          is_active: true
        });
        created.buildings++;
        console.log(`✅ Created building: ${buildingName}`);
        buildingMap.set(buildingKey, building);
      }
    } else {
      console.log(`♻️ Using cached building: "${buildingName}" (ID: ${building.id}) from Map`);
    }
    
    // 3. Create or get Floor
    const floorName = meterData.floor || 'Default Floor';
    const floorKey = `${building.id}-${floorName}`;
    let floor = floorMap.get(floorKey);
    
    if (!floor) {
      // ตรวจสอบว่ามี floor นี้อยู่แล้วในฐานข้อมูลหรือไม่
      try {
        const existingFloors = await meterTreeService.getFloorsByBuilding(building.id);
        const existingFloor = existingFloors.find((flr: any) => 
          flr.name.toLowerCase().trim() === floorName.toLowerCase().trim()
        );
        
        if (existingFloor) {
          floor = existingFloor;
          console.log(`🔍 Found existing floor: ${floorName} in building ${buildingName}`);
        } else {
          floor = await meterTreeService.createFloor({
            building_id: building.id,
            name: floorName,
            floor_number: 1,
            description: `Floor created from Excel import`,
            is_active: true
          });
          created.floors++;
          console.log(`✅ Created new floor: ${floorName} in building ${buildingName}`);
        }
      } catch (error) {
        // ถ้าไม่สามารถดึงข้อมูล floor ที่มีอยู่ได้ ให้สร้างใหม่
        console.warn(`⚠️ Cannot check existing floors, creating new: ${floorName}`);
        floor = await meterTreeService.createFloor({
          building_id: building.id,
          name: floorName,
          floor_number: 1,
          description: `Floor created from Excel import`,
          is_active: true
        });
        created.floors++;
        console.log(`✅ Created floor: ${floorName}`);
      }
      
      floorMap.set(floorKey, floor);
    }
    
    // 4. Create Meter
    // ตรวจสอบว่ามี meter นี้อยู่แล้วหรือไม่ (ตรวจจาก slave_id ที่ต้องไม่ซ้ำ)
    try {
      const existingMeters = await meterTreeService.getMetersByFloor(floor.id);
      const existingMeter = existingMeters.find((meter: any) => 
        meter.slave_id === meterData.slave_id || 
        meter.name.toLowerCase().trim() === meterData.meter_name.toLowerCase().trim()
      );
      
      if (existingMeter) {
        console.log(`🔍 Found existing meter: ${meterData.meter_name} (Slave ID: ${meterData.slave_id}) in floor ${floorName}`);
        console.warn(`⚠️ Skipping duplicate meter: ${meterData.meter_name}`);
      } else {
        console.log(`🔧 Creating building meter with baud_rate: ${meterData.baud_rate} (sending as budrate: ${meterData.baud_rate})`);
        const meter = await meterTreeService.createMeter({
          floor_id: floor.id,
          name: meterData.meter_name,
          brand: meterData.meter_brand,
          model: meterData.meter_model,
          meter_sn: meterData.meter_sn || '',
          protocol: 'RTU',
          ip_address: meterData.ip_address || '',
          slave_id: meterData.slave_id,
          port: meterData.port,
          budrate: meterData.baud_rate,
          ct_primary: meterData.ct_primary,
          ct_secondary: meterData.ct_secondary,
          pt_primary: meterData.pt_primary,
          pt_secondary: meterData.pt_secondary,
          is_active: true
        });
        created.meters++;
        console.log(`✅ Created new meter: ${meterData.meter_name} (Slave ID: ${meterData.slave_id}) in floor ${floorName}`);
      }
    } catch (error) {
      // ถ้าไม่สามารถดึงข้อมูล meter ที่มีอยู่ได้ ให้สร้างใหม่
      console.warn(`⚠️ Cannot check existing meters, creating new: ${meterData.meter_name}`);
      const meter = await meterTreeService.createMeter({
        floor_id: floor.id,
        name: meterData.meter_name,
        brand: meterData.meter_brand,
        model: meterData.meter_model,
        meter_sn: meterData.meter_sn || '',
        protocol: 'RTU',
        ip_address: meterData.ip_address || '',
        slave_id: meterData.slave_id,
        port: meterData.port,
        budrate: meterData.baud_rate,
        ct_primary: meterData.ct_primary,
        ct_secondary: meterData.ct_secondary,
        pt_primary: meterData.pt_primary,
        pt_secondary: meterData.pt_secondary,
        is_active: true
      });
      created.meters++;
      console.log(`✅ Created meter: ${meterData.meter_name}`);
    }
  }
  
  return {
    success: true,
    message: `Building tree created successfully: ${created.locations} locations, ${created.buildings} buildings, ${created.floors} floors, ${created.meters} meters`,
    created
  };
}
