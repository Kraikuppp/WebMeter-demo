// Meter Tree Database Service
// This service handles all database operations for the meter tree system

export interface Location {
  id: number;
  name: string;
  description?: string;
  parent_id?: number;
  parent_name?: string;
  location_floor_id?: number;
  created_at: string;
  updated_at: string;
}

export interface LogNet {
  id: number;
  location_id: number;
  sublocation_id?: number;
  name: string;
  model?: string;
  brand?: string;
  serial_number?: string;
  firmware_version?: string;
  ip_address?: string;
  subnet_mask?: string;
  gateway?: string;
  dns?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Building {
  id: number;
  location_id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Floor {
  id: number;
  building_id?: number;
  name: string;
  floor_number?: number;
  description?: string;
  floor_location_id?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Meter {
  id: number;
  name: string;
  brand?: string;
  model?: string;
  meter_sn?: string;
  protocol?: string;
  ip_address?: string;
  slave_id?: number;
  port?: number | string;
  budrate?: number;
  ct_primary?: number;
  pt_primary?: number;
  ct_secondary?: number;
  pt_secondary?: number;
  is_active: boolean;
  lognet_id?: number;
  floor_id?: number;
  is_disabled_in_building: boolean;
  created_at: string;
  updated_at: string;
}

// Tree Node interface for the frontend
export interface TreeNode {
  id: string;
  name: string;
  iconType: 'location' | 'lognet' | 'building' | 'floor' | 'meter' | 'folder';
  children?: TreeNode[];
  enabled?: boolean;
  onlineEnabled?: boolean;
  // Additional properties for meters
  brand?: string;
  model?: string;
  meter_sn?: string;
  protocol?: string;
  ip?: string;
  port?: string;
  budrate?: string;
  ct_primary?: string;
  ct_secondary?: string;
  pt_primary?: string;
  pt_secondary?: string;
  slave_id?: number; // เพิ่ม slave_id สำหรับมิเตอร์
  // Additional properties for lognets
  serialNumber?: string;
  firmwareVersion?: string;
  subnetMask?: string;
  gateway?: string;
  dns?: string;
}

class MeterTreeService {
  private baseUrl = '/api/meter-tree'; // API endpoint for meter tree operations

  // ===== LOCATIONS =====
  async getLocations(treeType?: string): Promise<Location[]> {
    try {
      const url = treeType ? `${this.baseUrl}/locations?tree_type=${treeType}` : `${this.baseUrl}/locations`;
      console.log('🌐 API Call: GET', url);
      const response = await fetch(url);
      console.log('📡 API Response Status:', response.status);
      if (!response.ok) throw new Error('Failed to fetch locations');
      const result = await response.json();
      console.log('✅ API Response Data:', result);
      return result;
    } catch (error) {
      console.error('Error fetching locations:', error);
      return [];
    }
  }

  async createLocation(location: Omit<Location, 'id' | 'created_at' | 'updated_at' | 'parent_name'> & { tree_type?: string }): Promise<Location | null> {
    try {
      console.log('🌐 API Call: POST', `${this.baseUrl}/locations`, location);
      const response = await fetch(`${this.baseUrl}/locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(location)
      });
      console.log('📡 API Response Status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        throw new Error(`Failed to create location: ${response.status} ${errorText}`);
      }
      const result = await response.json();
      console.log('✅ API Response Data:', result);
      return result;
    } catch (error) {
      console.error('❌ Error creating location:', error);
      return null;
    }
  }

  async updateLocation(id: number, location: Partial<Location>): Promise<Location | null> {
    try {
      const response = await fetch(`${this.baseUrl}/locations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(location)
      });
      if (!response.ok) throw new Error('Failed to update location');
      return await response.json();
    } catch (error) {
      console.error('Error updating location:', error);
      return null;
    }
  }

  async deleteLocation(id: number, treeType?: string): Promise<boolean> {
    try {
      const url = treeType ? `${this.baseUrl}/locations/${id}?tree_type=${treeType}` : `${this.baseUrl}/locations/${id}`;
      console.log('🗑️ API Call: DELETE', url);
      const response = await fetch(url, {
        method: 'DELETE'
      });
      console.log('📡 API Response Status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        return false;
      }
      console.log('✅ Location deleted successfully');
      return true;
    } catch (error) {
      console.error('❌ Error deleting location:', error);
      return false;
    }
  }

  // ===== LOGNETS =====
  async getLogNets(): Promise<LogNet[]> {
    try {
      const response = await fetch(`${this.baseUrl}/lognets`);
      if (!response.ok) throw new Error('Failed to fetch lognets');
      return await response.json();
    } catch (error) {
      console.error('Error fetching lognets:', error);
      return [];
    }
  }

  async getLogNetsByLocation(locationId: number): Promise<LogNet[]> {
    try {
      const response = await fetch(`${this.baseUrl}/lognets?location_id=${locationId}`);
      if (!response.ok) throw new Error('Failed to fetch lognets by location');
      return await response.json();
    } catch (error) {
      console.error('Error fetching lognets by location:', error);
      return [];
    }
  }

  async createLogNet(lognet: Omit<LogNet, 'id' | 'created_at' | 'updated_at'>): Promise<LogNet | null> {
    try {
      console.log('🌐 API Call: POST', `${this.baseUrl}/lognets`, lognet);
      
      const response = await fetch(`${this.baseUrl}/lognets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lognet)
      });
      
      console.log('📡 API Response Status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        throw new Error(`Failed to create lognet: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ API Response Data:', result);
      return result;
    } catch (error) {
      console.error('❌ Error creating lognet:', error);
      return null;
    }
  }

  async updateLogNet(id: number, lognet: Partial<LogNet>): Promise<LogNet | null> {
    try {
      const response = await fetch(`${this.baseUrl}/lognets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lognet)
      });
      if (!response.ok) throw new Error('Failed to update lognet');
      return await response.json();
    } catch (error) {
      console.error('Error updating lognet:', error);
      return null;
    }
  }

  async deleteLogNet(id: number): Promise<boolean> {
    try {
      console.log('🗑️ API Call: DELETE', `${this.baseUrl}/lognets/${id}`);
      const response = await fetch(`${this.baseUrl}/lognets/${id}`, {
        method: 'DELETE'
      });
      console.log('📡 API Response Status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        return false;
      }
      console.log('✅ LogNet deleted successfully');
      return true;
    } catch (error) {
      console.error('❌ Error deleting lognet:', error);
      return false;
    }
  }

  // ===== BUILDINGS =====
  async getBuildings(): Promise<Building[]> {
    try {
      const response = await fetch(`${this.baseUrl}/buildings`);
      if (!response.ok) throw new Error('Failed to fetch buildings');
      return await response.json();
    } catch (error) {
      console.error('Error fetching buildings:', error);
      return [];
    }
  }

  async getBuildingsByLocation(locationId: number): Promise<Building[]> {
    try {
      const response = await fetch(`${this.baseUrl}/buildings?location_id=${locationId}`);
      if (!response.ok) throw new Error('Failed to fetch buildings by location');
      return await response.json();
    } catch (error) {
      console.error('Error fetching buildings by location:', error);
      return [];
    }
  }

  async createBuilding(building: Omit<Building, 'id' | 'created_at' | 'updated_at'>): Promise<Building | null> {
    try {
      const response = await fetch(`${this.baseUrl}/buildings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(building)
      });
      if (!response.ok) throw new Error('Failed to create building');
      return await response.json();
    } catch (error) {
      console.error('Error creating building:', error);
      return null;
    }
  }

  async updateBuilding(id: number, building: Partial<Building>): Promise<Building | null> {
    try {
      const response = await fetch(`${this.baseUrl}/buildings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(building)
      });
      if (!response.ok) throw new Error('Failed to update building');
      return await response.json();
    } catch (error) {
      console.error('Error updating building:', error);
      return null;
    }
  }

  async deleteBuilding(id: number): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/buildings/${id}`, {
        method: 'DELETE'
      });
      return response.ok;
    } catch (error) {
      console.error('Error deleting building:', error);
      return false;
    }
  }

  // ===== FLOORS =====
  async getFloors(): Promise<Floor[]> {
    try {
      const response = await fetch(`${this.baseUrl}/floors`);
      if (!response.ok) throw new Error('Failed to fetch floors');
      return await response.json();
    } catch (error) {
      console.error('Error fetching floors:', error);
      return [];
    }
  }

  async getFloorsByBuilding(buildingId: number): Promise<Floor[]> {
    try {
      const response = await fetch(`${this.baseUrl}/floors?building_id=${buildingId}`);
      if (!response.ok) throw new Error('Failed to fetch floors by building');
      return await response.json();
    } catch (error) {
      console.error('Error fetching floors by building:', error);
      return [];
    }
  }

  async createFloor(floor: Omit<Floor, 'id' | 'created_at' | 'updated_at'>): Promise<Floor | null> {
    try {
      const response = await fetch(`${this.baseUrl}/floors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(floor)
      });
      if (!response.ok) throw new Error('Failed to create floor');
      return await response.json();
    } catch (error) {
      console.error('Error creating floor:', error);
      return null;
    }
  }

  async updateFloor(id: number, floor: Partial<Floor>): Promise<Floor | null> {
    try {
      const response = await fetch(`${this.baseUrl}/floors/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(floor)
      });
      if (!response.ok) throw new Error('Failed to update floor');
      return await response.json();
    } catch (error) {
      console.error('Error updating floor:', error);
      return null;
    }
  }

  async deleteFloor(id: number): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/floors/${id}`, {
        method: 'DELETE'
      });
      return response.ok;
    } catch (error) {
      console.error('Error deleting floor:', error);
      return false;
    }
  }

  // ===== METERS =====
  async getMeters(): Promise<Meter[]> {
    try {
      const response = await fetch(`${this.baseUrl}/meters`);
      if (!response.ok) throw new Error('Failed to fetch meters');
      return await response.json();
    } catch (error) {
      console.error('Error fetching meters:', error);
      return [];
    }
  }

  async getMetersByLogNet(lognetId: number): Promise<Meter[]> {
    try {
      const response = await fetch(`${this.baseUrl}/meters?lognet_id=${lognetId}`);
      if (!response.ok) throw new Error('Failed to fetch meters by lognet');
      return await response.json();
    } catch (error) {
      console.error('Error fetching meters by lognet:', error);
      return [];
    }
  }

  async getMetersByFloor(floorId: number): Promise<Meter[]> {
    try {
      const response = await fetch(`${this.baseUrl}/meters?floor_id=${floorId}`);
      if (!response.ok) throw new Error('Failed to fetch meters by floor');
      return await response.json();
    } catch (error) {
      console.error('Error fetching meters by floor:', error);
      return [];
    }
  }

  async createMeter(meter: Omit<Meter, 'id' | 'created_at' | 'updated_at'>): Promise<Meter | null> {
    try {
      const response = await fetch(`${this.baseUrl}/meters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meter)
      });
      if (!response.ok) throw new Error('Failed to create meter');
      return await response.json();
    } catch (error) {
      console.error('Error creating meter:', error);
      return null;
    }
  }

  async updateMeter(id: number, meter: Partial<Meter>): Promise<Meter | null> {
    try {
      const response = await fetch(`${this.baseUrl}/meters/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meter)
      });
      if (!response.ok) throw new Error('Failed to update meter');
      return await response.json();
    } catch (error) {
      console.error('Error updating meter:', error);
      return null;
    }
  }

  async deleteMeter(id: number): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/meters/${id}`, {
        method: 'DELETE'
      });
      return response.ok;
    } catch (error) {
      console.error('Error deleting meter:', error);
      return false;
    }
  }

  // ===== TREE BUILDING FUNCTIONS =====

  // Build System Tree (Location -> LogNet -> Meter)
  async buildSystemTree(): Promise<TreeNode[]> {
    try {
      const [locations, lognets, meters] = await Promise.all([
        this.getLocations(),
        this.getLogNets(),
        this.getMeters()
      ]);

      return locations.map(location => ({
        id: `location-${location.id}`,
        name: location.name,
        iconType: 'location' as const,
        children: lognets
          .filter(lognet => lognet.location_id === location.id && lognet.is_active)
          .map(lognet => ({
            id: `lognet-${lognet.id}`,
            name: lognet.name,
            iconType: 'lognet' as const,
            brand: lognet.brand,
            model: lognet.model,
            serialNumber: lognet.serial_number,
            firmwareVersion: lognet.firmware_version,
            ip: lognet.ip_address,
            subnetMask: lognet.subnet_mask,
            gateway: lognet.gateway,
            dns: lognet.dns,
            children: meters
              .filter(meter => meter.lognet_id === lognet.id && meter.is_active)
              .map(meter => ({
                id: `meter-${meter.id}`,
                name: meter.name,
                iconType: 'meter' as const,
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
              }))
          }))
      }));
    } catch (error) {
      console.error('Error building system tree:', error);
      return [];
    }
  }

  // Build Building Tree (Location -> Building -> Floor -> Meter)
  async buildBuildingTree(): Promise<TreeNode[]> {
    try {
      const [locations, buildings, floors, meters] = await Promise.all([
        this.getLocations(),
        this.getBuildings(),
        this.getFloors(),
        this.getMeters()
      ]);

      return locations.map(location => ({
        id: `location-${location.id}`,
        name: location.name,
        iconType: 'location' as const,
        children: buildings
          .filter(building => building.location_id === location.id && building.is_active)
          .map(building => ({
            id: `building-${building.id}`,
            name: building.name,
            iconType: 'building' as const,
            children: floors
              .filter(floor => floor.building_id === building.id && floor.is_active)
              .map(floor => ({
                id: `floor-${floor.id}`,
                name: floor.name,
                iconType: 'floor' as const,
                children: meters
                  .filter(meter => meter.floor_id === floor.id && meter.is_active)
                  .map(meter => ({
                    id: `meter-${meter.id}`,
                    name: meter.name,
                    iconType: 'meter' as const,
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
                  }))
              }))
          }))
      }));
    } catch (error) {
      console.error('Error building building tree:', error);
      return [];
    }
  }

  // Build Online Tree (filtered version of Building Tree - only enabled meters)
  async buildOnlineTree(): Promise<TreeNode[]> {
    try {
      const [locations, buildings, floors, meters] = await Promise.all([
        this.getLocations(),
        this.getBuildings(),
        this.getFloors(),
        this.getMeters()
      ]);

      return locations.map(location => ({
        id: `location-${location.id}`,
        name: location.name,
        iconType: 'location' as const,
        children: buildings
          .filter(building => building.location_id === location.id && building.is_active)
          .map(building => ({
            id: `building-${building.id}`,
            name: building.name,
            iconType: 'building' as const,
            children: floors
              .filter(floor => floor.building_id === building.id && floor.is_active)
              .map(floor => ({
                id: `floor-${floor.id}`,
                name: floor.name,
                iconType: 'floor' as const,
                children: meters
                  .filter(meter => 
                    meter.floor_id === floor.id && 
                    meter.is_active && 
                    !meter.is_disabled_in_building // กรองมิเตอร์ที่ถูก disable ออกไป
                  )
                  .map(meter => ({
                    id: `meter-${meter.id}`,
                    name: meter.name,
                    iconType: 'meter' as const,
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
                  }))
              }))
              .filter(floor => floor.children && floor.children.length > 0) // ลบ floor ที่ไม่มีมิเตอร์
          }))
          .filter(building => building.children && building.children.length > 0) // ลบ building ที่ไม่มี floor
      }))
      .filter(location => location.children && location.children.length > 0); // ลบ location ที่ไม่มี building
    } catch (error) {
      console.error('Error building online tree:', error);
      return [];
    }
  }

  // Helper function to filter enabled meters for online tree
  private filterEnabledTree(nodes: TreeNode[]): TreeNode[] {
    return nodes.map(node => {
      const isMeterNode = node.iconType === 'meter';
      if (isMeterNode && (!node.enabled || !node.onlineEnabled)) {
        return null;
      }
      
      const children = node.children ? this.filterEnabledTree(node.children) : [];
      return { ...node, children };
    }).filter(Boolean) as TreeNode[];
  }

  // ===== BULK OPERATIONS =====

  // Import tree data from Excel or JSON
  async importTreeData(data: any): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/import-tree`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return response.ok;
    } catch (error) {
      console.error('Error importing tree data:', error);
      return false;
    }
  }

  // Export tree data to JSON
  async exportTreeData(): Promise<any> {
    try {
      const [systemTree, buildingTree] = await Promise.all([
        this.buildSystemTree(),
        this.buildBuildingTree()
      ]);
      
      return {
        systemTree,
        buildingTree,
        exportDate: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error exporting tree data:', error);
      return null;
    }
  }

  // ===== FAVORITE METERS =====

  // Get user's favorite meters
  async getFavoriteMeters(userId: number = 1, treeType?: string): Promise<any[]> {
    try {
      const url = treeType 
        ? `${this.baseUrl}/favorites?user_id=${userId}&tree_type=${treeType}`
        : `${this.baseUrl}/favorites?user_id=${userId}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch favorite meters');
      return await response.json();
    } catch (error) {
      console.error('Error fetching favorite meters:', error);
      return [];
    }
  }

  // Add meter to favorites
  async addFavoriteMeter(userId: number = 1, meterId: number, treeType: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/favorites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, meter_id: meterId, tree_type: treeType })
      });
      if (!response.ok) throw new Error('Failed to add meter to favorites');
      return await response.json();
    } catch (error) {
      console.error('Error adding meter to favorites:', error);
      return null;
    }
  }

  // Remove meter from favorites
  async removeFavoriteMeter(userId: number = 1, meterId: number, treeType: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/favorites/${meterId}?user_id=${userId}&tree_type=${treeType}`, {
        method: 'DELETE'
      });
      return response.ok;
    } catch (error) {
      console.error('Error removing meter from favorites:', error);
      return false;
    }
  }

  // Toggle favorite status
  async toggleFavoriteMeter(userId: number = 1, meterId: number, treeType: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/favorites/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, meter_id: meterId, tree_type: treeType })
      });
      if (!response.ok) throw new Error('Failed to toggle favorite status');
      return await response.json();
    } catch (error) {
      console.error('Error toggling favorite status:', error);
      return null;
    }
  }
}

export const meterTreeService = new MeterTreeService();
export default meterTreeService;
