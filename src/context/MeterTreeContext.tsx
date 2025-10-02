import React, { createContext, useContext, useState, useEffect } from 'react';
import { meterTreeService } from '@/services/meterTreeService';

const MeterTreeContext = createContext(null);

export function MeterTreeProvider({ children }) {
  // แยก state สำหรับแต่ละหน้า
  const [systemNodes, setSystemNodes] = useState([]);
  const [buildingNodes, setBuildingNodes] = useState([]);
  const [onlineNodes, setOnlineNodes] = useState([]);
  const [loading, setLoading] = useState(true);

  // ฟังก์ชันโหลดข้อมูลสำหรับ System Tree (Location -> LogNet -> Meter)
  const loadSystemTreeFromDatabase = async () => {
    try {
      console.log('🔄 Loading System Tree data from database...');
             const [locations, lognets, meters] = await Promise.all([
         meterTreeService.getLocations('system'),
         meterTreeService.getLogNets(),
         meterTreeService.getMeters()
       ]);
       
       // เรียงลำดับมิเตอร์ตาม id (ลำดับการสร้าง)
       meters.sort((a, b) => a.id - b.id);
      console.log('✅ Loaded System Tree data:', { locations: locations.length, lognets: lognets.length, meters: meters.length });
      
      // สร้าง System Tree structure
      const buildSystemTree = (locations: any[], parentId: number | null = null): any[] => {
        return locations
          .filter(location => location.parent_id === parentId)
          .map(location => {
            // หา lognets ที่อยู่ใน location นี้
            const locationLogNets = lognets.filter(lognet => {
              if (lognet.location_id === location.id && 
                  (lognet.sublocation_id === null || lognet.sublocation_id === undefined)) {
                return true;
              }
              if (lognet.sublocation_id === location.id) {
                return true;
              }
              return false;
            });
            
            // หา sub-locations
            const subLocations = buildSystemTree(locations, location.id);
            
            // รวม lognets และ sub-locations เป็น children
            const children = [
              ...subLocations,
              ...locationLogNets.map(lognet => {
                // คำนวณจำนวนมิเตอร์ใน LogNet นี้
                const lognetMeters = meters.filter(meter => meter.lognet_id === lognet.id);
                const meterCount = lognetMeters.length;
                
                return {
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
                  meterCount: meterCount, // เพิ่มจำนวนมิเตอร์
                  children: lognetMeters
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
                      budrate: meter.budrate?.toString(),
                      ct_primary: meter.ct_primary?.toString(),
                      ct_secondary: meter.ct_secondary?.toString(),
                      pt_primary: meter.pt_primary?.toString(),
                      pt_secondary: meter.pt_secondary?.toString(),
                      slave_id: meter.slave_id, // เพิ่ม slave_id
                      children: []
                    }))
                };
              })
            ];
            
            return {
              id: `location-${location.id}`,
              name: location.name,
              parent_id: location.parent_id,
              iconType: location.parent_id === null && location.location_floor_id === null ? 'location' : 'folder',
              children: children
            };
          });
      };
      
      const nodes = buildSystemTree(locations);
      setSystemNodes(nodes);
      console.log('✅ System Tree nodes:', nodes);
    } catch (error) {
      console.error('❌ Error loading System Tree data:', error);
    }
  };

  // ฟังก์ชันโหลดข้อมูลสำหรับ Building Tree (Location -> Building -> Floor -> Meter)
  const loadBuildingTreeFromDatabase = async () => {
    try {
      console.log('🔄 Loading Building Tree data from database...');
      const [locations, buildings, floors, meters] = await Promise.all([
        meterTreeService.getLocations('building'),
        meterTreeService.getBuildings(),
        meterTreeService.getFloors(),
        meterTreeService.getMeters()
      ]);
      
      // เรียงลำดับมิเตอร์ตาม id (ลำดับการสร้าง)
      meters.sort((a, b) => a.id - b.id);
      console.log('✅ Loaded Building Tree data:', { locations: locations.length, buildings: buildings.length, floors: floors.length, meters: meters.length });
      
      // สร้าง Building Tree structure
      const buildBuildingTree = (locations: any[], parentId: number | null = null): any[] => {
        return locations
          .filter(location => location.parent_id === parentId)
          .map(location => {
            // หา buildings ที่อยู่ใน location นี้
            const locationBuildings = buildings.filter(building => building.location_id === location.id);
            
            // หา sub-locations
            const subLocations = buildBuildingTree(locations, location.id);
            
            // หา floors ที่ไม่มี building_id (standalone floors)
            const standaloneFloors = floors.filter(floor => floor.building_id === null);
            
            // หา sub-locations ที่อยู่ใน floor นี้ (จะ filter ใน map function)
            
            // รวม buildings, standalone floors และ sub-locations เป็น children
            const children = [
              ...subLocations,
              ...locationBuildings.map(building => ({
                id: `building-${building.id}`,
                name: building.name,
                iconType: 'building',
                children: floors
                  .filter(floor => floor.building_id === building.id)
                  .map(floor => ({
                    id: `floor-${floor.id}`,
                    name: floor.name,
                    iconType: 'floor',
                    children: [
                      // meters ใน floor นี้
                      ...meters
                        .filter(meter => {
                          const matches = meter.floor_id === floor.id;
                          if (matches) {
                            console.log('🔍 Found meter for Floor:', {
                              meterId: meter.id,
                              meterName: meter.name,
                              floorId: floor.id,
                              floorName: floor.name
                            });
                          }
                          return matches;
                        })
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
                          slave_id: meter.slave_id, // เพิ่ม slave_id
                          children: []
                        })),
                      // sub-locations ที่อยู่ใน floor นี้
                      ...locations
                        .filter(loc => loc.location_floor_id === floor.id)
                        .map(loc => ({
                          id: `location-${loc.id}`,
                          name: loc.name,
                          iconType: 'folder',
                          children: []
                        }))
                    ]
                  }))
              })),
              // เพิ่ม standalone floors เป็น children ของ location
              ...standaloneFloors.map(floor => ({
                id: `floor-${floor.id}`,
                name: floor.name,
                iconType: 'floor',
                children: [
                  // meters ใน floor นี้
                  ...meters
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
                      slave_id: meter.slave_id, // เพิ่ม slave_id
                      children: []
                    })),
                  // sub-locations ที่อยู่ใน floor นี้
                  ...locations
                    .filter(loc => loc.location_floor_id === floor.id)
                    .map(loc => ({
                      id: `location-${loc.id}`,
                      name: loc.name,
                      iconType: 'folder',
                      children: []
                    }))
                ]
              }))
            ];
            
            return {
              id: `location-${location.id}`,
              name: location.name,
              parent_id: location.parent_id,
              iconType: location.parent_id === null && location.location_floor_id === null ? 'location' : 'folder',
              children: children
            };
          });
      };
      
      const nodes = buildBuildingTree(locations);
      setBuildingNodes(nodes);
      console.log('✅ Building Tree nodes:', nodes);
    } catch (error) {
      console.error('❌ Error loading Building Tree data:', error);
    }
  };

  // ฟังก์ชันโหลดข้อมูลสำหรับ Online Tree (Building Tree ที่ filter เฉพาะ enabled meters)
  const loadOnlineTreeFromDatabase = async () => {
    try {
      console.log('🔄 Loading Online Tree data from database...');
      const [locations, buildings, floors, meters] = await Promise.all([
        meterTreeService.getLocations('building'),
        meterTreeService.getBuildings(),
        meterTreeService.getFloors(),
        meterTreeService.getMeters()
      ]);
      
      // เรียงลำดับมิเตอร์ตาม id (ลำดับการสร้าง)
      meters.sort((a, b) => a.id - b.id);
      console.log('✅ Loaded Online Tree data:', { locations: locations.length, buildings: buildings.length, floors: floors.length, meters: meters.length });
      
      // สร้าง Online Tree structure (filter เฉพาะ enabled meters)
      const buildOnlineTree = (locations: any[], parentId: number | null = null): any[] => {
        return locations
          .filter(location => location.parent_id === parentId)
          .map(location => {
            // หา buildings ที่อยู่ใน location นี้
            const locationBuildings = buildings.filter(building => building.location_id === location.id);
            
            // หา sub-locations
            const subLocations = buildOnlineTree(locations, location.id);
            
            // หา floors ที่ไม่มี building_id (standalone floors)
            const standaloneFloors = floors.filter(floor => floor.building_id === null);
            
            // รวม buildings, standalone floors และ sub-locations เป็น children
            const children = [
              ...subLocations,
              ...locationBuildings.map(building => ({
                id: `building-${building.id}`,
                name: building.name,
                iconType: 'building',
                children: floors
                  .filter(floor => floor.building_id === building.id)
                  .map(floor => ({
                    id: `floor-${floor.id}`,
                    name: floor.name,
                    iconType: 'floor',
                    children: [
                      // meters ใน floor นี้ (filter enabled meters)
                      ...meters
                        .filter(meter => meter.floor_id === floor.id && meter.is_active && !meter.is_disabled_in_building)
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
                          slave_id: meter.slave_id, // เพิ่ม slave_id
                          children: []
                        })),
                      // sub-locations ที่อยู่ใน floor นี้
                      ...locations
                        .filter(loc => loc.location_floor_id === floor.id)
                        .map(loc => ({
                          id: `location-${loc.id}`,
                          name: loc.name,
                          iconType: 'folder',
                          children: []
                        }))
                    ]
                  }))
              })),
              // เพิ่ม standalone floors เป็น children ของ location
              ...standaloneFloors.map(floor => ({
                id: `floor-${floor.id}`,
                name: floor.name,
                iconType: 'floor',
                children: [
                  // meters ใน floor นี้ (filter enabled meters)
                  ...meters
                    .filter(meter => meter.floor_id === floor.id && meter.is_active && !meter.is_disabled_in_building)
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
                      slave_id: meter.slave_id, // เพิ่ม slave_id
                      children: []
                    })),
                  // sub-locations ที่อยู่ใน floor นี้
                  ...locations
                    .filter(loc => loc.location_floor_id === floor.id)
                    .map(loc => ({
                      id: `location-${loc.id}`,
                      name: loc.name,
                      iconType: 'folder',
                      children: []
                    }))
                ]
              }))
            ];
            
            return {
              id: `location-${location.id}`,
              name: location.name,
              parent_id: location.parent_id,
              iconType: location.parent_id === null && location.location_floor_id === null ? 'location' : 'folder',
              children: children
            };
          });
      };
      
      const nodes = buildOnlineTree(locations);
      setOnlineNodes(nodes);
      console.log('✅ Online Tree nodes:', nodes);
    } catch (error) {
      console.error('❌ Error loading Online Tree data:', error);
    }
  };

  // ฟังก์ชัน refresh สำหรับแต่ละหน้า
  const refreshSystemTree = async () => {
    console.log('🔄 refreshSystemTree called');
    await loadSystemTreeFromDatabase();
    console.log('✅ refreshSystemTree completed');
  };

  const refreshBuildingTree = async () => {
    console.log('🔄 refreshBuildingTree called');
    await loadBuildingTreeFromDatabase();
    console.log('✅ refreshBuildingTree completed');
  };

  const refreshOnlineTree = async () => {
    console.log('🔄 refreshOnlineTree called');
    await loadOnlineTreeFromDatabase();
    console.log('✅ refreshOnlineTree completed');
  };

  // โหลดข้อมูลทั้งหมดตอน mount
  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      await Promise.all([
        loadSystemTreeFromDatabase(),
        loadBuildingTreeFromDatabase(),
        loadOnlineTreeFromDatabase()
      ]);
      setLoading(false);
    };
    loadAllData();
  }, []);

  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedSlaveIds, setSelectedSlaveIds] = useState([]); // เพิ่มตัวแปรเก็บ slave_id
  const [selectedMeterNames, setSelectedMeterNames] = useState([]); // เพิ่มตัวแปรเก็บชื่อมิเตอร์
  
  return (
    <MeterTreeContext.Provider value={{ 
      systemNodes, 
      setSystemNodes, 
      buildingNodes, 
      setBuildingNodes, 
      onlineNodes, 
      setOnlineNodes, 
      selectedNodeId, 
      setSelectedNodeId, 
                     selectedSlaveIds, // เพิ่มใน context
               setSelectedSlaveIds, // เพิ่มใน context
               selectedMeterNames, // เพิ่มใน context
               setSelectedMeterNames, // เพิ่มใน context
      loading,
      refreshSystemTree,
      refreshBuildingTree,
      refreshOnlineTree 
    }}>
      {children}
    </MeterTreeContext.Provider>
  );
}

export function useMeterTree() {
  const ctx = useContext(MeterTreeContext);
  if (!ctx) throw new Error('useMeterTree must be used within MeterTreeProvider');
  return ctx;
} 