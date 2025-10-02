import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, Trash2, Info, ChevronRight, ChevronDown, Circle, Square, Server, Thermometer, Zap, Layers, Folder, FolderOpen, Plug, Gauge, HardDrive, Database, Box, Plus, ArrowDown, Building2, Pencil, Eye, EyeOff, Wrench, HousePlus, FileSpreadsheet, X } from 'lucide-react';
import { TbServer } from 'react-icons/tb';
import { MdOutlineStairs } from 'react-icons/md';
import { MdDomain } from 'react-icons/md';
import { BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { Star as StarIcon } from 'lucide-react';
import { PiMicrosoftExcelLogoLight } from 'react-icons/pi';
import { FaRegFileExcel } from 'react-icons/fa';
import { MdDomainAdd } from 'react-icons/md';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem
} from '@/components/ui/context-menu';
import { useMeterTree } from '@/context/MeterTreeContext';
import { useLanguage } from '@/context/LanguageContext';
import { meterTreeService } from '@/services/meterTreeService';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';

const amptonIcon = <Server className="inline w-3 h-3 text-blue-400 mr-1" />;
// meterIcon สำหรับ PhysicalTreeNode จะถูก wrap ด้วยพื้นหลังน้ำเงินเข้ม
const meterIcon = <Gauge className="inline w-3 h-3 text-white" />;
const folderIcon = <Folder className="inline w-4 h-4 text-gray-700 mr-1" />;
const floorIcon = <Square className="inline w-3 h-3 text-green-500 mr-1" />;
const tempIcon = <Thermometer className="inline w-3 h-3 text-pink-400 mr-1" />;
// buildingIcon สำหรับ PhysicalTreeNode (แทน portIcon เดิม) - ใช้ FolderOpen
const buildingIcon = (
  <span style={{ background: '#f3f4f6', borderRadius: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, marginRight: 4 }}>
    <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
  </span>
);
// portIcon เดิม (ใช้ใน ReadOnlyTreeNode เท่านั้น)
const portIcon = <Server className="inline w-3 h-3 text-gray-400 mr-1" />;
const systemIcon = <MdDomain className="inline w-5 h-5 mr-1 text-primary" />;

// Modal สำหรับสร้างและแก้ไข LogNet
function CreateLogNetModal({ isOpen, onClose, onSave, initialData, isEditing }: { 
  isOpen: boolean, 
  onClose: () => void, 
  onSave: (data: any) => void,
  initialData?: any,
  isEditing?: boolean 
}) {
  const [formData, setFormData] = useState({
    name: '',
    model: '',
    brand: '',
    serial_number: '',
    firmware_version: '',
    ip_address: '',
    subnet_mask: '',
    gateway: '',
    dns: ''
  });

  // อัปเดต formData เมื่อ initialData เปลี่ยน (สำหรับการ edit)
  useEffect(() => {
    if (initialData && isEditing) {
      setFormData(initialData);
    } else {
      // Reset form สำหรับการสร้างใหม่
      setFormData({
        name: '',
        model: '',
        brand: '',
        serial_number: '',
        firmware_version: '',
        ip_address: '',
        subnet_mask: '',
        gateway: '',
        dns: ''
      });
    }
  }, [initialData, isEditing, isOpen]);

  const handleSubmit = () => {
    if (formData.name.trim()) {
      onSave(formData);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-none p-6 w-96 max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">{isEditing ? 'Edit LogNet' : 'Create New LogNet'}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full border border-gray-300 rounded-none px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Model</label>
            <input
              type="text"
              value={formData.model}
              onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
              className="w-full border border-gray-300 rounded-none px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Brand</label>
            <input
              type="text"
              value={formData.brand}
              onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
              className="w-full border border-gray-300 rounded-none px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Serial Number</label>
            <input
              type="text"
              value={formData.serial_number}
              onChange={(e) => setFormData(prev => ({ ...prev, serial_number: e.target.value }))}
              className="w-full border border-gray-300 rounded-none px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Firmware Version</label>
            <input
              type="text"
              value={formData.firmware_version}
              onChange={(e) => setFormData(prev => ({ ...prev, firmware_version: e.target.value }))}
              className="w-full border border-gray-300 rounded-none px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">IP Address</label>
            <input
              type="text"
              value={formData.ip_address}
              onChange={(e) => setFormData(prev => ({ ...prev, ip_address: e.target.value }))}
              className="w-full border border-gray-300 rounded-none px-3 py-2 text-sm"
              placeholder="192.168.1.100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Subnet Mask</label>
            <input
              type="text"
              value={formData.subnet_mask}
              onChange={(e) => setFormData(prev => ({ ...prev, subnet_mask: e.target.value }))}
              className="w-full border border-gray-300 rounded-none px-3 py-2 text-sm"
              placeholder="255.255.255.0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Gateway</label>
            <input
              type="text"
              value={formData.gateway}
              onChange={(e) => setFormData(prev => ({ ...prev, gateway: e.target.value }))}
              className="w-full border border-gray-300 rounded-none px-3 py-2 text-sm"
              placeholder="192.168.1.1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">DNS</label>
            <input
              type="text"
              value={formData.dns}
              onChange={(e) => setFormData(prev => ({ ...prev, dns: e.target.value }))}
              className="w-full border border-gray-300 rounded-none px-3 py-2 text-sm"
              placeholder="8.8.8.8"
            />
          </div>
          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={handleSubmit}
              className="flex-1 bg-primary text-white py-2 px-4 rounded-none hover:bg-primary/90"
            >
              {isEditing ? 'Update' : 'New'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-none hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Modal สำหรับสร้าง Node
function CreateNodeModal({ isOpen, onClose, onSave, initialSlaveId = '1', initialData = null, isEditing = false }: { 
  isOpen: boolean, 
  onClose: () => void, 
  onSave: (data: any) => void, 
  initialSlaveId?: string,
  initialData?: any,
  isEditing?: boolean 
}) {
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    model: '',
    meter_sn: '',
    protocol: '',
    ip: '',
    slave_id: initialSlaveId,
    port: '',
    ct_primary: '',
    ct_secondary: '',
    pt_primary: '',
    pt_secondary: '',
    budrate: ''
  });

  // อัปเดต formData เมื่อ initialData หรือ initialSlaveId เปลี่ยน
  useEffect(() => {
    if (initialData && isEditing) {
      setFormData({
        name: initialData.name || '',
        brand: initialData.brand || '',
        model: initialData.model || '',
        meter_sn: initialData.meter_sn || '',
        protocol: initialData.protocol || '',
        ip: initialData.ip || '',
        slave_id: initialData.slave_id?.toString() || initialSlaveId,
        port: initialData.port?.toString() || '',
        ct_primary: initialData.ct_primary?.toString() || '',
        ct_secondary: initialData.ct_secondary?.toString() || '',
        pt_primary: initialData.pt_primary?.toString() || '',
        pt_secondary: initialData.pt_secondary?.toString() || '',
        budrate: initialData.budrate?.toString() || ''
      });
    } else {
      // Reset form สำหรับการสร้างใหม่
      setFormData({
        name: '',
        brand: '',
        model: '',
        meter_sn: '',
        protocol: '8n1',
        ip: '',
        slave_id: initialSlaveId,
        port: '',
        ct_primary: '',
        ct_secondary: '',
        pt_primary: '',
        pt_secondary: '',
        budrate: ''
      });
    }
  }, [initialData, isEditing, initialSlaveId, isOpen]);

  // ตัวเลือก model ตาม brand
  const modelOptions = {
    Amptron: ['AI205', 'AI205-Pro'],
    Acuenergy: ['Acuvim-CL', 'Acuvim-II'],
    Schneider: ['PM2200'],
  };
  const currentModels = modelOptions[formData.brand] || [];

  const handleSubmit = () => {
    if (formData.name.trim()) {
      onSave(formData);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-none p-6 w-96 max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">{isEditing ? 'Edit Meter' : 'Create New Meter'}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full border border-gray-300 rounded-none px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Brand *</label>
            <select
              value={formData.brand}
              onChange={e => setFormData(prev => ({ ...prev, brand: e.target.value, model: '' }))}
              className="w-full border border-gray-300 rounded-none px-3 py-2 text-sm"
              required
            >
              <option value="Amptron">Amptron</option>
              <option value="Acuenergy">Acuenergy</option>
              <option value="Schneider">Schneider</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Model *</label>
            <select
              value={formData.model}
              onChange={e => setFormData(prev => ({ ...prev, model: e.target.value }))}
              className="w-full border border-gray-300 rounded-none px-3 py-2 text-sm"
              required
              disabled={!formData.brand}
            >
              <option value="">{formData.brand ? 'Select Model' : 'Select Brand First'}</option>
              {currentModels.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Meter SN</label>
            <input
              type="text"
              value={formData.meter_sn}
              onChange={(e) => setFormData(prev => ({ ...prev, meter_sn: e.target.value }))}
              className="w-full border border-gray-300 rounded-none px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Databit</label>
            <input
              type="text"
              value="8n1"
              className="w-full border border-gray-300 rounded-none px-3 py-2 text-sm bg-gray-100"
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">IP Address </label>
            <input
              type="text"
              value={formData.ip}
              onChange={(e) => setFormData(prev => ({ ...prev, ip: e.target.value }))}
              className="w-full border border-gray-300 rounded-none px-3 py-2 text-sm"

            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Slave ID (Auto)</label>
            <input
              type="number"
              value={formData.slave_id}
              onChange={(e) => setFormData(prev => ({ ...prev, slave_id: e.target.value }))}
              className="w-full border border-gray-300 rounded-none px-3 py-2 text-sm bg-gray-100"
              placeholder="1"
              readOnly
             
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Port</label>
            <input
              type="text"
              value={formData.port}
              onChange={(e) => setFormData(prev => ({ ...prev, port: e.target.value }))}
              className="w-full border border-gray-300 rounded-none px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">CT Primary *</label>
            <input
              type="text"
              value={formData.ct_primary}
              onChange={(e) => setFormData(prev => ({ ...prev, ct_primary: e.target.value }))}
              className="w-full border border-gray-300 rounded-none px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">CT Secondary *</label>
            <input
              type="text"
              value={formData.ct_secondary}
              onChange={(e) => setFormData(prev => ({ ...prev, ct_secondary: e.target.value }))}
              className="w-full border border-gray-300 rounded-none px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">PT Primary *</label>
            <input
              type="text"
              value={formData.pt_primary}
              onChange={(e) => setFormData(prev => ({ ...prev, pt_primary: e.target.value }))}
              className="w-full border border-gray-300 rounded-none px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">PT Secondary *</label>
            <input
              type="text"
              value={formData.pt_secondary}
              onChange={(e) => setFormData(prev => ({ ...prev, pt_secondary: e.target.value }))}
              className="w-full border border-gray-300 rounded-none px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Baud Rate</label>
            <select
              value={formData.budrate}
              onChange={(e) => setFormData(prev => ({ ...prev, budrate: e.target.value }))}
              className="w-full border border-gray-300 rounded-none px-3 py-2 text-sm"
            >
              <option value="">Select Baud Rate</option>
              <option value="9600">9600</option>
              <option value="19200">19200</option>
              <option value="38400">38400</option>
              <option value="57600">57600</option>
              <option value="115200">115200</option>
            </select>
          </div>
          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={handleSubmit}
              className="flex-1 bg-primary text-white py-2 px-4 rounded-none hover:bg-primary/90"
            >
              Create
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-none hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- ICON TYPE HELPER ---
function getIcon(iconType, isSystemNode = false) {
  if (isSystemNode) return systemIcon;
  switch (iconType) {
    case 'meter':
      return <span className="inline-flex items-center justify-center bg-blue-400 rounded" style={{ width: 16, height: 16, marginRight: 4 }}><Gauge className="w-3 h-3 text-white" /></span>;
    case 'lognet':
      return <TbServer className="inline w-4 h-4 text-purple-500 mr-1" />;
    case 'folder':
      return <FolderOpen className="inline w-4 h-4 text-primary mr-1" />;
    case 'location':
      return <MdDomain className="inline w-4 h-4 text-primary mr-1" />;
    case 'port':
      return <MdDomain className="inline w-4 h-4 text-primary mr-1" />;
    case 'floor':
      return <MdOutlineStairs className="inline w-4 h-4 text-green-500 mr-1" />;
    case 'temp':
      return <Thermometer className="inline w-3 h-3 text-pink-400 mr-1" />;
    default:
      return null;
  }
}

// --- เพิ่ม TreeNode สำหรับ PhysicalTree ---
function PhysicalTreeNode(props: any) {
  // Props สำหรับ callback เมื่อมีการเปลี่ยนแปลง online status
  const { onOnlineStatusChange } = props;
  const { node, setRootNode, level = 0, isLast = false, parentLines = [], editingChildId, setEditingChildId, onDelete, onEditRoot, onDeleteRoot, treeType = "system", onAddFavoriteBuilding, onAddFavoriteOnline, readOnly = false, expanded = true, selectedNodeId, setSelectedNodeId, setSelectedSlaveIds, setSelectedMeterNames } = props;

  // Permissions
  const { permissions: userPermissions } = usePermissions();
  const meterTreePermissions = userPermissions?.['Meter Tree'] || { read: false, write: false, report: false };

  // Local state for children and editing
  const [children, setChildren] = useState(node.children || []);
  const [isExpanded, setIsExpanded] = useState(expanded);
  const [contextOpen, setContextOpen] = useState(false);
  const [showCreateNodeModal, setShowCreateNodeModal] = useState(false);
  const [showCreateLogNetModal, setShowCreateLogNetModal] = useState(false);
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [showSelectMeterModal, setShowSelectMeterModal] = useState(false);
  const [isEditingMeter, setIsEditingMeter] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isEditingLogNet, setIsEditingLogNet] = useState(false);
  const [initialSlaveId, setInitialSlaveId] = useState('1');

  // Sync isExpanded with expanded prop
  useEffect(() => {
    setIsExpanded(expanded);
  }, [expanded]);

  // --- Helper: Recursively update node by id ---
  function updateNodeById(tree: any, id: string, updater: (n: any) => any): any {
    if (tree.id === id) return updater(tree);
    if (!tree.children) return tree;
    return { ...tree, children: tree.children.map((c: any) => updateNodeById(c, id, updater)) };
  }
  // --- Helper: Recursively add child to node by id ---
  function addChildById(tree: any, id: string, child: any): any {
    if (tree.id === id) return { ...tree, children: [...(tree.children || []), child] };
    if (!tree.children) return tree;
    return { ...tree, children: tree.children.map((c: any) => addChildById(c, id, child)) };
  }
  // --- Helper: Recursively delete node by id ---
  function deleteNodeById(tree: any, id: string): any {
    if (!tree.children) return tree;
    return { ...tree, children: tree.children.filter((c: any) => c.id !== id).map((c: any) => deleteNodeById(c, id)) };
  }

  // --- Add new location node ---
  const handleCreateLocation = async () => {
    try {
      let parentId = null;
      let locationFloorId = null;
      
      // ตรวจสอบว่าเป็น location หรือ floor
      if (node.id.startsWith('location-')) {
        // ถ้าเป็น location ให้สร้าง sub-location
        parentId = parseInt(node.id.replace('location-', ''));
        console.log('🔄 Creating sub-location with parent_id:', parentId);
      } else if (node.id.startsWith('floor-')) {
        // ถ้าเป็น floor ให้สร้าง location ที่อยู่ใน floor
        locationFloorId = parseInt(node.id.replace('floor-', ''));
        console.log('🔄 Creating location in floor with floor_id:', locationFloorId);
      }
      
      // สร้าง location ใหม่ใน database
      const newLocation = await meterTreeService.createLocation({
        name: '',
        description: node.id.startsWith('floor-') ? 
          `Location created in floor from ${treeType} tree` : 
          `Sub-location created from ${treeType} tree`,
        parent_id: parentId,
        location_floor_id: locationFloorId,
        tree_type: treeType
      });
      
      if (newLocation) {
        console.log('✅ Location created successfully:', newLocation);
        
        // Refresh locations จาก database เพื่อให้แสดง hierarchical structure ถูกต้อง
        if (props.refreshLocations) {
          await props.refreshLocations();
        }
        
        // ตั้งค่า editing mode สำหรับ node ใหม่
        setEditingChildId(`location-${newLocation.id}`);
        setIsExpanded(true);
      }
    } catch (error) {
      console.error('❌ Error creating location in database:', error);
      // ถ้าเกิด error ให้ใช้ข้อมูล local
    const newId = `loc-${Date.now()}`;
    const newNode = {
      id: newId,
      name: '',
      iconType: 'folder',
      children: []
    };
    if (setRootNode) {
      setRootNode((prev: any) => addChildById(prev, node.id, newNode));
    }
    setIsExpanded(true);
    setEditingChildId(newId);
    }
  };

  // --- Add new building node ---
  const handleCreateBuilding = async () => {
    try {
      // หา location_id จาก node parent
      const locationId = node.id.startsWith('location-') ? parseInt(node.id.replace('location-', '')) : null;
      
      if (locationId) {
        // สร้าง building ใหม่ใน database
        const newBuilding = await meterTreeService.createBuilding({
          location_id: locationId,
          name: '',
          description: `Building created from ${treeType} tree`,
          is_active: true
        });
        
                  if (newBuilding) {
            console.log('✅ Building created successfully:', newBuilding);
            
            // Refresh locations จาก database เพื่อให้แสดง hierarchical structure ถูกต้อง
            if (props.refreshLocations) {
              await props.refreshLocations();
            }
            
            // ตั้งค่า editing mode สำหรับ node ใหม่
            setEditingChildId(`building-${newBuilding.id}`);
            setIsExpanded(true);
          }
      } else {
        // ถ้าไม่มี location_id ให้ใช้ข้อมูล local
        const newId = `building-${Date.now()}`;
    const newNode = {
      id: newId,
      name: '',
          iconType: 'building',
      children: []
    };
    if (setRootNode) {
      setRootNode((prev: any) => addChildById(prev, node.id, newNode));
    }
    setIsExpanded(true);
    setEditingChildId(newId);
      }
    } catch (error) {
      console.error('Error creating building in database:', error);
      // ถ้าเกิด error ให้ใช้ข้อมูล local
      const newId = `building-${Date.now()}`;
      const newNode = {
        id: newId,
        name: '',
        iconType: 'building',
        children: []
      };
      if (setRootNode) {
        setRootNode((prev: any) => addChildById(prev, node.id, newNode));
      }
      setIsExpanded(true);
      setEditingChildId(newId);
    }
  };

  // --- Add new floor node ---
  const handleCreateFloor = async () => {
    try {
      console.log('🔄 Creating new floor, current node:', node);
      
      // สร้าง floor ใหม่ใน database โดยไม่ต้องมี building ก่อน
      const newFloor = await meterTreeService.createFloor({
        building_id: null, // ไม่ต้องมี building_id
        name: '',
        floor_number: 1,
        description: `Floor created from ${treeType} tree`,
        is_active: true
      });
      
      if (newFloor) {
        console.log('✅ Floor created successfully:', newFloor);
        
        // Refresh locations จาก database เพื่อให้แสดง hierarchical structure ถูกต้อง
        if (props.refreshLocations) {
          await props.refreshLocations();
        }
        
        // ตั้งค่า editing mode สำหรับ node ใหม่
        setEditingChildId(`floor-${newFloor.id}`);
        setIsExpanded(true);
      } else {
        console.error('❌ Failed to create floor in database');
        // ถ้าเกิด error ให้ใช้ข้อมูล local
        const newId = `floor-${Date.now()}`;
    const newNode = {
      id: newId,
          name: '',
          iconType: 'floor',
      children: []
    };
    if (setRootNode) {
      setRootNode((prev: any) => addChildById(prev, node.id, newNode));
    }
    setIsExpanded(true);
        setEditingChildId(newId);
      }
    } catch (error) {
      console.error('❌ Error creating floor in database:', error);
      // ถ้าเกิด error ให้ใช้ข้อมูล local
      const newId = `floor-${Date.now()}`;
    const newNode = {
      id: newId,
        name: '',
        iconType: 'floor',
      children: []
    };
    if (setRootNode) {
      setRootNode((prev: any) => addChildById(prev, node.id, newNode));
    }
    setIsExpanded(true);
      setEditingChildId(newId);
    }
  };

  // --- Add new meter node ---
  const handleCreateNode = async () => {
    // Reset editing mode
    setIsEditingMeter(false);
    
    // สำหรับ Building และ Online tree ให้แสดง SelectMeterModal
    if (props.treeType === 'building' || props.treeType === 'online') {
      setShowSelectMeterModal(true);
      return;
    }
    
    // สำหรับ System tree ใช้ logic เดิม
    if (node.id.startsWith('lognet-')) {
      // ตรวจสอบจำนวนมิเตอร์ใน LogNet ก่อน
      if (node.meterCount >= 32) {
        alert('❌ ไม่สามารถสร้างมิเตอร์เพิ่มได้: LogNet นี้มีมิเตอร์ครบ 32 ตัวแล้ว');
        return;
      }
      
      const lognetId = parseInt(node.id.replace('lognet-', ''));
      try {
        const existingMeters = await meterTreeService.getMetersByLogNet(lognetId);
        
        // คำนวณ slave_id ใหม่โดยใช้ slave_id สูงสุดที่มีอยู่ + 1
        let nextSlaveId = 1;
        if (existingMeters && existingMeters.length > 0) {
          const maxSlaveId = Math.max(...existingMeters.map(meter => meter.slave_id || 0));
          nextSlaveId = maxSlaveId + 1;
        }
        
        console.log('📊 Next slave_id for new meter:', nextSlaveId, 'Current meters count:', existingMeters?.length || 0, 'Max existing slave_id:', existingMeters ? Math.max(...existingMeters.map(meter => meter.slave_id || 0)) : 0);
        
        // อัปเดต initialSlaveId สำหรับ CreateNodeModal
        setInitialSlaveId(nextSlaveId.toString());
        
        // แสดง modal
        setShowCreateNodeModal(true);
      } catch (error) {
        console.error('❌ Error calculating next slave_id:', error);
        // ใช้ค่าเริ่มต้น 1 ถ้าเกิด error
        setInitialSlaveId('1');
        setShowCreateNodeModal(true);
      }
    } else {
      // สำหรับ Floor nodes หรืออื่นๆ
      setInitialSlaveId('1');
      setShowCreateNodeModal(true);
    }
  };

  // --- Add new lognet node ---
  const handleCreateLogNet = () => {
    // เก็บข้อมูล location สำหรับใช้ใน modal
    let locationId = null;
    let sublocationId = null;
    
    if (node.id.startsWith('location-')) {
      const id = parseInt(node.id.replace('location-', ''));
      // ตรวจสอบว่าเป็น Main Location หรือ Sub Location
      const isMainLocation = node.parent_id === null || node.parent_id === undefined;
      if (isMainLocation) {
        locationId = id;
      } else {
        locationId = node.parent_id;
        sublocationId = id;
      }
    }
    
    // เก็บข้อมูล location ไว้ใน state สำหรับใช้ใน modal
    setSelectedLocationId(locationId);
    setSelectedSubLocationId(sublocationId);
    
    // แสดง modal ให้กรอกข้อมูล
    setShowCreateLogNetModal(true);
  };



  // --- Save new meter ---
  const handleSaveNode = async (formData: any) => {
    try {
      if (isEditingMeter && node.id.startsWith('meter-')) {
        // Update existing Meter
        const meterId = parseInt(node.id.replace('meter-', ''));
        const budrate = parseInt(formData.budrate) || 9600;
        console.log(`🔧 Updating meter ${formData.name} - budrate from form: ${formData.budrate} → parsed: ${budrate}`);
        
        const meterData = {
          name: formData.name,
          brand: formData.brand,
          model: formData.model,
          meter_sn: formData.meter_sn,
          protocol: formData.protocol,
          ip_address: formData.ip || '',
          slave_id: parseInt(formData.slave_id) || 1,
          port: parseInt(formData.port) || 502,
          budrate: budrate,
          ct_primary: parseFloat(formData.ct_primary) || 100.00,
          pt_primary: parseFloat(formData.pt_primary) || 400.00,
          ct_secondary: parseFloat(formData.ct_secondary) || 5.00,
          pt_secondary: parseFloat(formData.pt_secondary) || 400.00,
          is_active: true
        };
        
        const updatedMeter = await meterTreeService.updateMeter(meterId, meterData);
        
        if (updatedMeter) {
          console.log('✅ Meter updated successfully:', updatedMeter);
          console.log('🔧 Updated meter budrate:', updatedMeter.budrate);
          setShowCreateNodeModal(false);
          setIsEditingMeter(false);
          
          if (props.refreshLocations) {
            await props.refreshLocations();
          }
        }
      } else {
        // Create new Meter
        console.log('🔄 Creating meter in database with parent node:', node);
        
        // หา parent ID และ type ตาม node type
        let lognetId = null;
        let floorId = null;
        let existingMeters = null;
        let nextSlaveId = 1;
        
        if (node.id.startsWith('lognet-')) {
          lognetId = parseInt(node.id.replace('lognet-', ''));
          console.log('📡 Creating meter for LogNet ID:', lognetId);
          
          // ตรวจสอบจำนวนมิเตอร์ใน LogNet นี้
          existingMeters = await meterTreeService.getMetersByLogNet(lognetId);
          if (existingMeters && existingMeters.length >= 32) {
            alert('❌ ไม่สามารถสร้างมิเตอร์เพิ่มได้: LogNet นี้มีมิเตอร์ครบ 32 ตัวแล้ว');
            setShowCreateNodeModal(false);
            return;
          }
          
          // คำนวณ slave_id ใหม่โดยใช้ slave_id สูงสุดที่มีอยู่ + 1
          if (existingMeters && existingMeters.length > 0) {
            const maxSlaveId = Math.max(...existingMeters.map(meter => meter.slave_id || 0));
            nextSlaveId = maxSlaveId + 1;
          }
          console.log('📊 Next slave_id:', nextSlaveId, 'Current meters count:', existingMeters?.length || 0, 'Max existing slave_id:', existingMeters ? Math.max(...existingMeters.map(meter => meter.slave_id || 0)) : 0);
          
        } else if (node.id.startsWith('floor-')) {
          floorId = parseInt(node.id.replace('floor-', ''));
          console.log('📡 Creating meter for Floor ID:', floorId);
        } else {
          console.error('❌ Invalid parent node type for meter creation:', node.id);
          setShowCreateNodeModal(false);
          return;
        }

        // สร้าง meter ใหม่ใน database
        const budrate = parseInt(formData.budrate) || 9600;
        console.log(`🔧 Creating meter ${formData.name} - budrate from form: ${formData.budrate} → parsed: ${budrate}`);
        
        const newMeter = await meterTreeService.createMeter({
          name: formData.name || '',
          brand: formData.brand || '',
          model: formData.model || '',
          meter_sn: formData.meter_sn || '',
          protocol: formData.protocol || '',
          ip_address: formData.ip || '',
          slave_id: lognetId ? nextSlaveId : parseInt(formData.slave_id) || 1,
          port: parseInt(formData.port) || 502,
          budrate: budrate,
          ct_primary: parseFloat(formData.ct_primary) || 100.00,
          pt_primary: parseFloat(formData.pt_primary) || 400.00,
          ct_secondary: parseFloat(formData.ct_secondary) || 5.00,
          pt_secondary: parseFloat(formData.pt_secondary) || 100.00,
          is_active: true,
          lognet_id: lognetId,
          floor_id: floorId,
          is_disabled_in_building: false
        });

        if (newMeter) {
          console.log('✅ Meter created successfully:', newMeter);
          console.log('🔧 Created meter budrate:', newMeter.budrate);
          console.log('📊 Meter details:', {
            id: newMeter.id,
            name: newMeter.name,
            budrate: newMeter.budrate,
            lognet_id: newMeter.lognet_id,
            floor_id: newMeter.floor_id,
            is_active: newMeter.is_active,
            is_disabled_in_building: newMeter.is_disabled_in_building
          });
          
          // Refresh locations จาก database เพื่อให้แสดง hierarchical structure ถูกต้อง
          if (props.refreshLocations) {
            console.log('🔄 Calling refreshLocations after meter creation');
            await props.refreshLocations();
            console.log('✅ refreshLocations completed');
          }
          
          setShowCreateNodeModal(false);
        } else {
          console.error('❌ Failed to create meter in database');
          setShowCreateNodeModal(false);
        }
      }
    } catch (error) {
      console.error('❌ Error saving meter to database:', error);
      setShowCreateNodeModal(false);
    }
  };

  // --- Save new lognet ---
  const handleSaveLogNet = async (formData: any) => {
    try {
      if (isEditingLogNet && node.id.startsWith('lognet-')) {
        // Update existing LogNet
        const lognetId = parseInt(node.id.replace('lognet-', ''));
        const updatedLogNet = await meterTreeService.updateLogNet(lognetId, {
          name: formData.name || '',
          model: formData.model || '',
          brand: formData.brand || '',
          serial_number: formData.serial_number || '',
          firmware_version: formData.firmware_version || '',
          ip_address: formData.ip_address || null,
          subnet_mask: formData.subnet_mask || null,
          gateway: formData.gateway || null,
          dns: formData.dns || null,
          is_active: true
        });
        
        if (updatedLogNet) {
          console.log('✅ LogNet updated successfully:', updatedLogNet);
          setShowCreateLogNetModal(false);
          setIsEditingLogNet(false);
          if (props.refreshLocations) {
            await props.refreshLocations();
          }
        }
      } else {
        // Create new LogNet
        const locationId = selectedLocationId || (node.id.startsWith('location-') ? parseInt(node.id.replace('location-', '')) : null);

        if (locationId) {
          const newLogNet = await meterTreeService.createLogNet({
            location_id: locationId,
            sublocation_id: selectedSubLocationId,
            name: formData.name || '',
            model: formData.model || '',
            brand: formData.brand || '',
            serial_number: formData.serial_number || '',
            firmware_version: formData.firmware_version || '',
            ip_address: formData.ip_address || null,
            subnet_mask: formData.subnet_mask || null,
            gateway: formData.gateway || null,
            dns: formData.dns || null,
            is_active: true
          });

          if (newLogNet) {
            console.log('✅ LogNet created successfully:', newLogNet);
            setShowCreateLogNetModal(false);
            if (props.refreshLocations) {
              await props.refreshLocations();
            }
            setSelectedLocationId(null);
            setSelectedSubLocationId(null);
          }
        } else {
          console.error('No location ID available');
          setShowCreateLogNetModal(false);
        }
      }
    } catch (error) {
      console.error('Error saving/updating lognet to database:', error);
      setShowCreateLogNetModal(false);
      setIsEditingLogNet(false);
    }
  };

  // --- Edit node name ---
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (setRootNode) {
      setRootNode((prev: any) => updateNodeById(prev, node.id, (n: any) => ({ ...n, name: e.target.value })));
    }
  };

  // --- Edit Meter (เปิด modal) ---
  const handleEditMeter = () => {
    if (node.id.startsWith('meter-')) {
      // ตั้งค่าเป็น editing mode
      setIsEditingMeter(true);
      
      // แสดง modal สำหรับ edit
      setShowCreateNodeModal(true);
    }
  };

  // --- Edit LogNet (เปิด modal) ---
  const handleEditLogNet = () => {
    if (node.id.startsWith('lognet-')) {
      // เตรียมข้อมูล LogNet ปัจจุบันสำหรับ modal
      const lognetData = {
        name: node.name || '',
        model: node.model || '',
        brand: node.brand || '',
        serial_number: node.serialNumber || '',
        firmware_version: node.firmwareVersion || '',
        ip_address: node.ip || '',
        subnet_mask: node.subnetMask || '',
        gateway: node.gateway || '',
        dns: node.dns || ''
      };
      
      // เก็บข้อมูล LogNet ปัจจุบันไว้ใน state (จะส่งผ่าน props ให้ CreateLogNetModal)
      
      // ตั้งค่าเป็น editing mode
      setIsEditingLogNet(true);
      
      // แสดง modal สำหรับ edit
      setShowCreateLogNetModal(true);
    }
  };

  const handleNameBlur = async () => {
    setEditingChildId(null);
    
    try {
      // อัปเดตข้อมูลใน database ตาม node type
      if (node.id.startsWith('location-')) {
        const locationId = parseInt(node.id.replace('location-', ''));
        await meterTreeService.updateLocation(locationId, {
          name: node.name,
          description: `Location updated from ${treeType} tree`
        });
      } else if (node.id.startsWith('lognet-')) {
        const lognetId = parseInt(node.id.replace('lognet-', ''));
        await meterTreeService.updateLogNet(lognetId, {
          name: node.name
        });
      } else if (node.id.startsWith('building-')) {
        const buildingId = parseInt(node.id.replace('building-', ''));
        await meterTreeService.updateBuilding(buildingId, {
          name: node.name,
          description: `Building updated from ${treeType} tree`
        });
      } else if (node.id.startsWith('floor-')) {
        const floorId = parseInt(node.id.replace('floor-', ''));
        await meterTreeService.updateFloor(floorId, {
          name: node.name,
          description: `Floor updated from ${treeType} tree`
        });
      } else if (node.id.startsWith('meter-')) {
        const meterId = parseInt(node.id.replace('meter-', ''));
        await meterTreeService.updateMeter(meterId, {
          name: node.name
        });
      }
      
      // Refresh locations จาก database เพื่อให้แสดง hierarchical structure ถูกต้อง
      if (props.refreshLocations) {
        await props.refreshLocations();
      }
    } catch (error) {
      console.error('Error updating node in database:', error);
    }

    // ลบ nodes ที่ชื่อว่าง
    if (setRootNode) {
      setRootNode((prev: any) => {
        function pruneEmpty(tree: any): any {
          if (!tree.children) return tree;
          return { ...tree, children: tree.children.filter((c: any) => c.name.trim() !== '').map(pruneEmpty) };
        }
        return pruneEmpty(prev);
      });
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setEditingChildId(null);
    }
    if (e.key === 'Escape') {
      if (setRootNode) {
        setRootNode((prev: any) => deleteNodeById(prev, node.id));
      }
      setEditingChildId(null);
    }
  };

  // --- Delete node ---
  const handleDeleteChild = async (id: string, level?: number) => {
    try {
      console.log('🗑️ Frontend: Deleting node with ID:', id, 'Level:', level);
      
      // ตรวจสอบประเภทของ node และลบจาก database
      if (id.startsWith('location-')) {
        const locationId = parseInt(id.replace('location-', ''));
        console.log('🗑️ Frontend: Deleting location with ID:', locationId, 'Tree Type:', props.treeType);
        console.log('📝 Note: This will also delete all lognets, buildings, floors, and meters associated with this Location due to CASCADE constraint');
        const success = await meterTreeService.deleteLocation(locationId, props.treeType);
        if (success) {
          console.log('✅ Frontend: Location and associated data deleted from database successfully');
        } else {
          console.error('❌ Frontend: Failed to delete location from database');
          return;
        }
      } else if (id.startsWith('lognet-')) {
        const lognetId = parseInt(id.replace('lognet-', ''));
        console.log('🗑️ Frontend: Deleting lognet with ID:', lognetId);
        console.log('📝 Note: This will also delete all meters associated with this LogNet due to CASCADE constraint');
        const success = await meterTreeService.deleteLogNet(lognetId);
        if (success) {
          console.log('✅ Frontend: LogNet and associated meters deleted from database successfully');
        } else {
          console.error('❌ Frontend: Failed to delete lognet from database');
          return;
        }
      } else if (id.startsWith('building-')) {
        const buildingId = parseInt(id.replace('building-', ''));
        console.log('🗑️ Frontend: Deleting building with ID:', buildingId);
        console.log('📝 Note: This will also delete all floors and meters associated with this Building due to CASCADE constraint');
        const success = await meterTreeService.deleteBuilding(buildingId);
        if (success) {
          console.log('✅ Frontend: Building and associated floors/meters deleted from database successfully');
        } else {
          console.error('❌ Frontend: Failed to delete building from database');
          return;
        }
      } else if (id.startsWith('floor-')) {
        const floorId = parseInt(id.replace('floor-', ''));
        console.log('🗑️ Frontend: Deleting floor with ID:', floorId);
        console.log('📝 Note: This will also delete all meters associated with this Floor due to CASCADE constraint');
        const success = await meterTreeService.deleteFloor(floorId);
        if (success) {
          console.log('✅ Frontend: Floor and associated meters deleted from database successfully');
        } else {
          console.error('❌ Frontend: Failed to delete floor from database');
          return;
        }
      } else if (id.startsWith('meter-')) {
        const meterId = parseInt(id.replace('meter-', ''));
        console.log('🗑️ Frontend: Deleting meter with ID:', meterId);
        const success = await meterTreeService.deleteMeter(meterId);
        if (success) {
          console.log('✅ Frontend: Meter deleted from database successfully');
        } else {
          console.error('❌ Frontend: Failed to delete meter from database');
          return;
        }
      }
      
      // Refresh data จาก database หลังจากลบสำเร็จ
      if (props.refreshLocations) {
        console.log('🔄 Frontend: Refreshing data after deletion');
        await props.refreshLocations();
        console.log('✅ Frontend: Data refreshed successfully');
      }
      
      // ลบจาก local state (fallback)
    if (setRootNode) {
      if (node.id === id && !props.parentLines?.length) {
        // If deleting root node, clear its name and children
        setRootNode((prev: any) => ({ ...prev, name: '', children: [] }));
      } else {
        setRootNode((prev: any) => deleteNodeById(prev, id));
      }
      }
    } catch (error) {
      console.error('❌ Frontend: Error deleting node:', error);
    }
  };

  // --- Enable/Disable meter node ---
  const handleToggleEnable = () => {
    if (setRootNode) {
      setRootNode((prev: any) => updateNodeById(prev, node.id, (n: any) => ({ ...n, enabled: !n.enabled })));
    }
  };

  // --- Toggle Online status for meter nodes ---
  const handleToggleOnline = async () => {
    try {
      if (node.id.startsWith('meter-')) {
        const meterId = parseInt(node.id.replace('meter-', ''));
        const currentOnlineEnabled = node.onlineEnabled !== false; // ถ้าไม่ใช่ false ให้ถือว่าเป็น true
        const newOnlineEnabled = !currentOnlineEnabled;
        
        console.log('🔄 Toggling online status for meter:', meterId, 'from', currentOnlineEnabled, 'to', newOnlineEnabled);
        
        // อัปเดตใน database
        const updatedMeter = await meterTreeService.updateMeter(meterId, {
          is_disabled_in_building: !newOnlineEnabled // is_disabled_in_building เป็น inverse ของ onlineEnabled
        });
        
        if (updatedMeter) {
          console.log('✅ Meter online status updated successfully:', updatedMeter);
          
          // อัปเดต local state
          if (setRootNode) {
            setRootNode((prev: any) => updateNodeById(prev, node.id, (n: any) => ({ 
              ...n, 
              onlineEnabled: newOnlineEnabled 
            })));
          }
          
          // Refresh ทั้ง Building และ Online tree เพื่อให้แสดงผลถูกต้อง
          if (props.refreshLocations) {
            console.log('🔄 Refreshing trees after online status change');
            await props.refreshLocations();
            console.log('✅ Trees refreshed successfully');
          }
          
          // แสดง toast แจ้งเตือน
          console.log(`✅ Meter "${node.name}" ${newOnlineEnabled ? 'enabled' : 'disabled'} for online view`);
          
          // ใช้ toast จาก context
          if (props.treeType === 'building') {
            // เรียก toast จาก parent component
            if (props.onOnlineStatusChange) {
              props.onOnlineStatusChange(node.name, newOnlineEnabled);
            }
          }
        } else {
          console.error('❌ Failed to update meter online status in database');
        }
      } else {
        console.error('❌ Invalid node type for online toggle:', node.id);
      }
    } catch (error) {
      console.error('❌ Error toggling online status:', error);
    }
  };

  // Helper: is this a meter node?
  const isMeterNode = node.iconType === 'meter';
  const isLogNetNode = node.iconType === 'lognet';
  const isSystemNode = level === 0;
  const isEnabled = node.enabled !== false;
  const isLastChild = isLast;

  // Improved line drawing constants
  const INDENT = 24; // px (เยื้องแต่ละชั้น)
  const LINE_OFFSET = 8; // px (จุดเชื่อมโยง, กึ่งกลางปุ่ม expand/collapse)
  const NODE_HEIGHT = 24; // px (ความสูงของ node)

  let paddingLeft = level * INDENT;
  if (isMeterNode) {
    paddingLeft = paddingLeft - 12;
  }

  // --- Handle meter selection from database ---
  const handleSelectMeter = async (selectedMeter: any) => {
    try {
      console.log('📋 Selected meter:', selectedMeter);
      
      if (props.treeType === 'building') {
        // สำหรับ Building tree ให้อัปเดต floor_id ของมิเตอร์
        if (node.id.startsWith('floor-')) {
          const floorId = parseInt(node.id.replace('floor-', ''));
          console.log('🔧 Updating meter', selectedMeter.id, 'with floor_id:', floorId);
          const updatedMeter = await meterTreeService.updateMeter(selectedMeter.id, {
            floor_id: floorId
          });
          if (updatedMeter) {
            console.log('✅ Meter assigned to floor:', floorId);
          } else {
            console.error('❌ Failed to update meter');
            return;
          }
        } else {
          console.error('❌ Invalid node type for building tree. Expected floor node, got:', node.id);
          return;
        }
      } else if (props.treeType === 'online') {
        // สำหรับ Online tree ให้อัปเดต lognet_id ของมิเตอร์
        if (node.id.startsWith('lognet-')) {
          const lognetId = parseInt(node.id.replace('lognet-', ''));
          console.log('🔧 Updating meter', selectedMeter.id, 'with lognet_id:', lognetId);
          const updatedMeter = await meterTreeService.updateMeter(selectedMeter.id, {
            lognet_id: lognetId
          });
          if (updatedMeter) {
            console.log('✅ Meter assigned to lognet:', lognetId);
          } else {
            console.error('❌ Failed to update meter');
            return;
          }
        } else {
          console.error('❌ Invalid node type for online tree. Expected lognet node, got:', node.id);
          return;
        }
      } else {
        console.error('❌ Unsupported tree type:', props.treeType);
        return;
      }
      
      // ปิด modal
      setShowSelectMeterModal(false);
      
      // Refresh ข้อมูลจาก database
      console.log('🔄 Refreshing data after meter assignment...');
      console.log('📋 refreshLocations function:', props.refreshLocations);
      if (props.refreshLocations) {
        try {
          await props.refreshLocations();
          console.log('✅ Data refreshed successfully');
        } catch (error) {
          console.error('❌ Error refreshing data:', error);
        }
      } else {
        console.error('❌ refreshLocations function is not provided');
      }
      
      // แสดง toast แจ้งเตือน
      console.log('✅ Meter assigned successfully');
      
    } catch (error) {
      console.error('❌ Error assigning meter:', error);
    }
  };

  return (
    <div className="relative" style={{ minHeight: NODE_HEIGHT }}>
      <CreateNodeModal
        isOpen={showCreateNodeModal}
        onClose={() => setShowCreateNodeModal(false)}
        onSave={handleSaveNode}
        initialSlaveId={initialSlaveId}
        initialData={isEditingMeter && node.id.startsWith('meter-') ? {
          name: node.name || '',
          brand: node.brand || '',
          model: node.model || '',
          meter_sn: node.meter_sn || '',
          protocol: node.protocol || '',
          ip: node.ip || '',
          slave_id: node.slave_id || 1,
          port: node.port || '',
          ct_primary: node.ct_primary || '',
          ct_secondary: node.ct_secondary || '',
          pt_primary: node.pt_primary || '',
          pt_secondary: node.pt_secondary || '',
          budrate: node.budrate || ''
        } : null}
        isEditing={isEditingMeter}
      />
      <SelectMeterModal
        isOpen={showSelectMeterModal}
        onClose={() => setShowSelectMeterModal(false)}
        onSelect={handleSelectMeter}
        treeType={props.treeType}
      />
      <CreateLogNetModal
        isOpen={showCreateLogNetModal}
        onClose={() => setShowCreateLogNetModal(false)}
        onSave={handleSaveLogNet}
        initialData={isEditingLogNet && node.id.startsWith('lognet-') ? {
          name: node.name || '',
          model: node.model || '',
          brand: node.brand || '',
          serial_number: node.serialNumber || '',
          firmware_version: node.firmwareVersion || '',
          ip_address: node.ip || '',
          subnet_mask: node.subnetMask || '',
          gateway: node.gateway || '',
          dns: node.dns || ''
        } : null}
        isEditing={isEditingLogNet}
      />
      {/* Property Modal */}
      {showPropertyModal && (
        <div className="fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-none p-6 w-96 max-h-[80vh] overflow-y-auto shadow-lg">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              {isMeterNode ? (
                <>
                  <span className="inline-flex items-center justify-center bg-blue-400 rounded mr-2" style={{ width: 20, height: 20 }}>
                    <Gauge className="w-4 h-4 text-white" />
                  </span>
                  Meter Property
                </>
              ) : isLogNetNode ? (
                <>
                  <TbServer className="w-5 h-5 text-purple-500 mr-2" />
                  LogNet Property
                </>
              ) : (
                'Property'
              )}
            </h3>
                      <div className="space-y-2 text-sm">
            <div><span className="font-medium">Name:</span> {node.name}</div>
            {isMeterNode ? (
              <>
                <div><span className="font-medium">Brand:</span> {node.brand || '-'}</div>
                <div><span className="font-medium">Model:</span> {node.model || '-'}</div>
                <div><span className="font-medium">Meter SN:</span> {node.meter_sn || '-'}</div>
                <div><span className="font-medium">Protocol:</span> {node.protocol || '-'}</div>
                <div><span className="font-medium">IP Address:</span> {node.ip || '-'}</div>
                <div><span className="font-medium">Port:</span> {node.port || '-'}</div>
                <div><span className="font-medium">Baud Rate:</span> {(() => {
                  console.log(`🔧 Displaying budrate for ${node.name}: ${node.budrate} (type: ${typeof node.budrate})`);
                  return node.budrate || '-';
                })()}</div>
                <div><span className="font-medium">CT Primary:</span> {node.ct_primary || '-'}</div>
                <div><span className="font-medium">CT Secondary:</span> {node.ct_secondary || '-'}</div>
                <div><span className="font-medium">PT Primary:</span> {node.pt_primary || '-'}</div>
                <div><span className="font-medium">PT Secondary:</span> {node.pt_secondary || '-'}</div>
              </>
            ) : isLogNetNode ? (
              <>
                <div><span className="font-medium">Brand:</span> {node.brand || '-'}</div>
                <div><span className="font-medium">Model:</span> {node.model || '-'}</div>
                <div><span className="font-medium">Serial Number:</span> {node.serialNumber || '-'}</div>
                <div><span className="font-medium">Firmware Version:</span> {node.firmwareVersion || '-'}</div>
                <div><span className="font-medium">IP Address:</span> {node.ip || '-'}</div>
                <div><span className="font-medium">Subnet Mask:</span> {node.subnetMask || '-'}</div>
                <div><span className="font-medium">Gateway:</span> {node.gateway || '-'}</div>
                <div><span className="font-medium">DNS:</span> {node.dns || '-'}</div>
                <div><span className="font-medium">Meters Count:</span> {node.meterCount || 0}/32</div>
              </>
            ) : null}
          </div>
            <div className="flex justify-end mt-6">
              <button className="bg-primary text-white px-4 py-1.5 rounded-none hover:bg-primary/90" onClick={() => setShowPropertyModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Enhanced tree lines - เส้นตั้งต่อเนื่องจากระดับบน */}
      {parentLines.map((shouldShowLine: boolean, index: number) => (
        shouldShowLine ? (
          <div
            key={index}
            className="absolute border-l border-gray-500"
            style={{
              left: `${index * INDENT + 8}px`, // 8px = กึ่งกลางปุ่ม 16px
              top: 0,
              bottom: 0,
              zIndex: 0
            }}
          />
        ) : null
      ))}
      
      {/* Tree connection lines for current node */}
      {level > 0 && (
        <>
          {/* เส้นตั้งจากบนลงมายังจุดกึ่งกลางของ node นี้ */}
          <div
            className="absolute border-l border-gray-500"
            style={{
              left: `${(level - 1) * INDENT + 8}px`,
              top: 0,
              height: `${NODE_HEIGHT / 2 + 2}px`,
              zIndex: 0
            }}
          />
          {/* เส้นนอนจากเส้นตั้งไปยัง icon */}
          <div
            className="absolute border-t border-gray-500"
            style={{
              left: `${(level - 1) * INDENT + 8}px`,
              top: `${NODE_HEIGHT / 2 + 1}px`,
              width: `${INDENT - 4}px`,
              zIndex: 0
            }}
          />
        </>
      )}

      <ContextMenu onOpenChange={setContextOpen}>
        <ContextMenuTrigger asChild>
          <div
            className={`flex items-center space-x-1 py-1 px-1 text-[12px] relative group transition-colors cursor-pointer
              ${contextOpen ? 'bg-gray-200' : 'hover:bg-gray-100 focus:bg-gray-100'}
              ${selectedNodeId === node.id ? 'bg-blue-100 border border-blue-300' : ''}
            `}
            style={{
              paddingLeft: `${paddingLeft}px`,
              zIndex: 1,
              minHeight: `${NODE_HEIGHT}px`
            }}
            tabIndex={0}
            onClick={() => {
              if (node.iconType === 'meter') {
                console.log('🎯 Meter clicked:', node.id, node.name);
                console.log('🔧 setSelectedNodeId function:', setSelectedNodeId);
                if (setSelectedNodeId) {
                  setSelectedNodeId(node.id);
                  console.log('✅ setSelectedNodeId called with:', node.id);
                  
                  // ตั้งค่า selectedSlaveIds และ selectedMeterNames
                  if (setSelectedSlaveIds && setSelectedMeterNames) {
                    const slaveId = node.slave_id || node.id.replace('meter-', '');
                    setSelectedSlaveIds([slaveId]);
                    setSelectedMeterNames([node.name]);
                    console.log('✅ setSelectedSlaveIds called with:', [slaveId]);
                    console.log('✅ setSelectedMeterNames called with:', [node.name]);
                  }
                } else {
                  console.error('❌ setSelectedNodeId is not available');
                }
              }
            }}
          >
            {/* ปุ่มย่อ/ขยาย */}
            {(children.length > 0 || (node.children && node.children.length > 0)) ? (
              <button
                type="button"
                className="mr-1 focus:outline-none flex items-center justify-center bg-gray-100 border border-gray-300 hover:bg-gray-200"
                style={{ 
                  width: 16, 
                  height: 16, 
                  borderRadius: 2, 
                  fontSize: 10, 
                  fontWeight: 'bold'
                }}
                onClick={() => setIsExpanded((v) => !v)}
                tabIndex={0}
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? '−' : '+'}
              </button>
            ) : (
              <span style={{ width: 16, height: 16, display: 'inline-block', marginRight: 4 }} />
            )}
            
            {/* Icon */}
            {getIcon(node.iconType, isSystemNode)}
            
            {editingChildId === node.id ? (
              <input
                className="border border-gray-300 rounded-none px-2 py-0.5 text-[12px] outline-none focus:ring-2 focus:ring-blue-400"
                value={node.name}
                onChange={handleNameChange}
                onBlur={handleNameBlur}
                onKeyDown={handleNameKeyDown}
                style={{ minWidth: 80 }}
                autoFocus
              />
            ) : (
              <span
                className={`truncate group-hover:font-semibold group-focus:font-semibold ${isSystemNode ? 'font-bold' : ''} ${isMeterNode && !isEnabled ? 'text-gray-400' : 'text-foreground'}`}
                onDoubleClick={() => setEditingChildId(node.id)}
              >
                {node.name}
              </span>
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {/* Edit - แยกการจัดการระหว่าง LogNet, Meter และ node อื่นๆ - ซ่อนใน Online tree */}
          {!readOnly && (
            <>
              {isLogNetNode ? (
                <ContextMenuItem 
                  onClick={meterTreePermissions.write ? handleEditLogNet : undefined}
                  disabled={!meterTreePermissions.write}
                  className={!meterTreePermissions.write ? "opacity-50 cursor-not-allowed" : ""}
                >
                  <Pencil className="w-4 h-4 text-gray-500 mr-2" /> Edit LogNet
                </ContextMenuItem>
              ) : isMeterNode ? (
                <ContextMenuItem 
                  onClick={meterTreePermissions.write ? handleEditMeter : undefined}
                  disabled={!meterTreePermissions.write}
                  className={!meterTreePermissions.write ? "opacity-50 cursor-not-allowed" : ""}
                >
                  <Pencil className="w-4 h-4 text-gray-500 mr-2" /> Edit Meter
                </ContextMenuItem>
              ) : (
          <ContextMenuItem 
            onClick={meterTreePermissions.write ? () => setEditingChildId(node.id) : undefined}
            disabled={!meterTreePermissions.write}
            className={!meterTreePermissions.write ? "opacity-50 cursor-not-allowed" : ""}
          >
            <Pencil className="w-4 h-4 text-gray-500 mr-2" /> Edit
          </ContextMenuItem>
              )}
            </>
          )}
          {/* New Location/Building - แสดงใน location และ floor nodes ในทุก tree ยกเว้น Online tree */}
          {!readOnly && !isMeterNode && !isLogNetNode && 
           (node.iconType === 'location' || node.iconType === 'floor') && 
           props.treeType !== 'online' && (
            <ContextMenuItem 
              onClick={meterTreePermissions.write ? handleCreateLocation : undefined}
              disabled={!meterTreePermissions.write}
              className={!meterTreePermissions.write ? "opacity-50 cursor-not-allowed" : ""}
            >
              {props.treeType === 'building' ? (
                <>
                  <FolderOpen className="w-4 h-4 text-blue-600 mr-2" /> New Building
                </>
              ) : (
                <>
                  <Folder className="w-4 h-4 text-blue-400 mr-2" /> New Location
                </>
              )}
            </ContextMenuItem>
          )}
          {/* New Floor - เฉพาะใน Meter Tree Building และ Online - ซ่อนใน Online tree */}
          {!readOnly && !isMeterNode && props.treeType !== 'system' && (
            <ContextMenuItem 
              onClick={meterTreePermissions.write ? handleCreateFloor : undefined}
              disabled={!meterTreePermissions.write}
              className={!meterTreePermissions.write ? "opacity-50 cursor-not-allowed" : ""}
            >
              <MdOutlineStairs className="w-4 h-4 text-green-500 mr-2" /> New Floor
            </ContextMenuItem>
          )}
          {/* New Meter - เฉพาะใน Meter Tree Building และ Online - ซ่อนใน Online tree */}
          {!readOnly && !isMeterNode && !isLogNetNode && props.treeType !== 'system' && (
            <ContextMenuItem 
              onClick={meterTreePermissions.write ? handleCreateNode : undefined}
              disabled={!meterTreePermissions.write}
              className={!meterTreePermissions.write ? "opacity-50 cursor-not-allowed" : ""}
            >
              <span className="inline-flex items-center justify-center bg-blue-400 rounded" style={{ width: 16, height: 16, marginRight: 8 }}><Gauge className="w-3 h-3 text-white" /></span>Add Meter
            </ContextMenuItem>
          )}
          {/* New Meter - เฉพาะใน Meter Tree System ภายใต้ LogNet เท่านั้น - ซ่อนใน Online tree */}
          {!readOnly && !isMeterNode && props.treeType === 'system' && isLogNetNode && (
            <ContextMenuItem 
              onClick={meterTreePermissions.write ? handleCreateNode : undefined}
              disabled={node.meterCount >= 32 || !meterTreePermissions.write}
              className={(node.meterCount >= 32 || !meterTreePermissions.write) ? 'opacity-50 cursor-not-allowed' : ''}
            >
              <span className="inline-flex items-center justify-center bg-blue-400 rounded" style={{ width: 16, height: 16, marginRight: 8 }}><Gauge className="w-3 h-3 text-white" /></span> 
              New Meter {node.meterCount >= 32 ? '(Max 32)' : !meterTreePermissions.write ? '(No Permission)' : ''}
            </ContextMenuItem>
          )}
          {/* New LogNet - เฉพาะใน Meter Tree System - ซ่อนใน Online tree */}
          {!readOnly && !isMeterNode && !isLogNetNode && props.treeType === 'system' && (
            <ContextMenuItem 
              onClick={meterTreePermissions.write ? handleCreateLogNet : undefined}
              disabled={!meterTreePermissions.write}
              className={!meterTreePermissions.write ? "opacity-50 cursor-not-allowed" : ""}
            >
              <TbServer className="w-4 h-4 text-purple-500 mr-2" /> New LogNet
            </ContextMenuItem>
          )}
          {/* Delete - ซ่อนใน Online tree */}
          {!readOnly && (
            <>
          <ContextMenuItem 
            onClick={meterTreePermissions.write ? () => onDelete && onDelete(node.id, level) : undefined}
            disabled={!meterTreePermissions.write}
            className={!meterTreePermissions.write ? "opacity-50 cursor-not-allowed" : ""}
          >
            <Trash2 className="w-4 h-4 text-red-500 mr-2" /> Delete
          </ContextMenuItem>
          {/* --- เพิ่มปุ่ม Delete สำหรับ root node --- */}
          {level === 0 && onDeleteRoot && (
            <ContextMenuItem 
              onClick={meterTreePermissions.write ? onDeleteRoot : undefined}
              disabled={!meterTreePermissions.write}
              className={!meterTreePermissions.write ? "opacity-50 cursor-not-allowed" : ""}
            >
              <Trash2 className="w-4 h-4 text-red-600 mr-2" /> Delete System
            </ContextMenuItem>
          )}
            </>
          )}
          {/* Disable/Enable Online - เฉพาะใน Meter Tree Building สำหรับ meter node เท่านั้น - ซ่อนใน Online tree */}
          {!readOnly && isMeterNode && props.treeType === 'building' && (
            <ContextMenuItem 
              onClick={meterTreePermissions.write ? handleToggleOnline : undefined}
              disabled={!meterTreePermissions.write}
              className={!meterTreePermissions.write ? "opacity-50 cursor-not-allowed" : ""}
            >
              {node.onlineEnabled !== false ? (
                <>
                  <EyeOff className="w-4 h-4 text-orange-500 mr-2" /> Disable Online
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 text-green-500 mr-2" /> Enable Online
                </>
              )}
            </ContextMenuItem>
          )}

          {/* Add to Favorite - เฉพาะ meter node ใน Building และ Online Tree เท่านั้น */}
          {isMeterNode && props.treeType !== 'system' && (
            <ContextMenuItem onClick={() => {
              console.log('Add to Favorite clicked:', node.name, props.treeType);
              if (props.treeType === 'building') {
                console.log('Calling handleAddFavoriteBuilding');
                props.onAddFavoriteBuilding && props.onAddFavoriteBuilding(node.name, false);
              } else if (props.treeType === 'online') {
                console.log('Calling handleAddFavoriteOnline');
                props.onAddFavoriteOnline && props.onAddFavoriteOnline(node.name, false);
              }
            }}>
              <Star className="w-4 h-4 text-yellow-500 mr-2" /> Add to Favorite
            </ContextMenuItem>
          )}

          {/* Property - แสดงในทุก tree รวมถึง Online tree */}
          {(isMeterNode || isLogNetNode) && (
            <ContextMenuItem onClick={() => setShowPropertyModal(true)}>
              <Info className="w-4 h-4 text-gray-500 mr-2" /> Property
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>
      
      {/* Render children */}
      {(node.children && node.children.length > 0) && isExpanded && (
        <div className="relative">
          {node.children.map((child: any, idx: number) => {
            const isLastChild = idx === node.children.length - 1;
            // parentLines: ถ้าไม่ใช่ลูกตัวสุดท้าย ให้ true (มีเส้นต่อ), ถ้าเป็นตัวสุดท้าย false (ไม่ต้องมีเส้นต่อ)
            const newParentLines = [...parentLines, !isLastChild];
            return (
              <PhysicalTreeNode
                key={child.id}
                node={child}
                setRootNode={setRootNode}
                level={level + 1}
                parentLines={newParentLines}
                editingChildId={editingChildId}
                setEditingChildId={setEditingChildId}
                onDelete={handleDeleteChild}
                treeType={props.treeType}
                onAddFavoriteBuilding={props.onAddFavoriteBuilding}
                onAddFavoriteOnline={props.onAddFavoriteOnline}
                refreshLocations={props.refreshLocations}
                readOnly={readOnly}
                expanded={expanded}
                onOnlineStatusChange={props.onOnlineStatusChange}
                selectedNodeId={props.selectedNodeId}
                setSelectedNodeId={props.setSelectedNodeId}
                setSelectedSlaveIds={props.setSelectedSlaveIds}
                setSelectedMeterNames={props.setSelectedMeterNames}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// Add a read-only tree node that visually matches PhysicalTreeNode (lines, icons, indentation), but disables all actions and context menu
function ReadOnlyTreeNode({ node, level = 0, isLast = false, parentLines = [], onAddFavorite, favoriteList = [] }) {
  // Helper: is this a lognet node?
  const isLogNetNode = node.iconType === 'lognet';
  const [isExpanded, setIsExpanded] = useState(true);
  const [contextOpen, setContextOpen] = useState(false);
  if (!node) return null;
  
  const hasChildren = node.children && node.children.length > 0;
  
  // Use same constants as PhysicalTreeNode for consistency
  const INDENT = 24;
  const LINE_OFFSET = 8;
  const NODE_HEIGHT = 24;
  
  // Helper: is this a meter node?
  const isMeterNode = node.iconType === 'meter';
  // Helper: is this a folder node?
  const isFolderNode = node.iconType === 'folder';
  // Helper: is this a port node?
  const isPortNode = node.iconType === 'port';
  // เช็คว่าอยู่ใน favorite หรือไม่
  const isFavorite = favoriteList && favoriteList.includes(node.name);
  const isSystemNode = level === 0;
  const isLastChild = isLast;
  
  let paddingLeft = level * INDENT;
  if (isMeterNode) {
    paddingLeft = paddingLeft - 12;
  }

  return (
    <div className="relative" style={{ minHeight: NODE_HEIGHT }}>
      {/* Enhanced tree lines - same as PhysicalTreeNode */}
      {parentLines.map((shouldShowLine, index) =>
        shouldShowLine ? (
          <div
            key={index}
            className="absolute border-l border-gray-500"
            style={{
              left: `${index * INDENT + 8}px`,
              top: 0,
              bottom: 0,
              zIndex: 0
            }}
          />
        ) : null
      )}
      
      {level > 0 && (
        <>
          {/* เส้นตั้งจากบนลงมายังจุดกึ่งกลางของ node นี้ */}
          <div
            className="absolute border-l border-gray-500"
            style={{
              left: `${(level - 1) * INDENT + 8}px`,
              top: 0,
              height: `${NODE_HEIGHT / 2 + 2}px`,
              zIndex: 0
            }}
          />
          {/* เส้นนอนจากเส้นตั้งไปยัง icon */}
          <div
            className="absolute border-t border-gray-500"
            style={{
              left: `${(level - 1) * INDENT + 8}px`,
              top: `${NODE_HEIGHT / 2 + 1}px`,
              width: `${INDENT - 4}px`,
              zIndex: 0
            }}
          />
        </>
      )}

      {/* Context menu trigger */}
      <div
        className="flex items-center space-x-1 py-1 px-1 text-[12px] relative group hover:bg-gray-100 rounded transition-colors cursor-pointer"
        style={{
          paddingLeft: `${paddingLeft}px`,
          zIndex: 1,
          minHeight: `${NODE_HEIGHT}px`
        }}
        onContextMenu={isMeterNode && onAddFavorite ? (e) => {
          e.preventDefault();
          setContextOpen(true);
        } : undefined}
      >
        {/* Expand/Collapse button */}
        {hasChildren ? (
          <button
            type="button"
            className="mr-1 focus:outline-none flex items-center justify-center bg-gray-100 border border-gray-300 hover:bg-gray-200"
            style={{ 
              width: 16, 
              height: 16, 
              borderRadius: 2, 
              fontSize: 10, 
              fontWeight: 'bold'
            }}
            onClick={() => setIsExpanded((v) => !v)}
            tabIndex={0}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '−' : '+'}
          </button>
        ) : (
          <span style={{ width: 16, height: 16, display: 'inline-block', marginRight: 4 }} />
        )}
        
        {/* Icon */}
        {isSystemNode
          ? systemIcon
          : isFolderNode ? (
            <Folder className="inline w-4 h-4 text-gray-700 mr-1" />
          ) : isPortNode ? (
            <Folder className="inline w-4 h-4 text-blue-400 mr-1" />
          ) : isMeterNode ? (
            <span className="inline-flex items-center justify-center bg-blue-400 rounded" style={{ width: 16, height: 16, marginRight: 4 }}><Gauge className="w-3 h-3 text-white" /></span>
          ) : (
            <span className="inline-block w-3 h-3 bg-gray-300 rounded-none mr-1" />
          )}
        
        <span
          className={`truncate group-hover:font-semibold group-focus:font-semibold ${isSystemNode ? 'font-bold' : ''} ${isMeterNode && node.enabled === false ? 'text-gray-400' : 'text-foreground'}`}
        >
          {node.name}
          {isLogNetNode && node.meterCount !== undefined && (
            <span className="ml-2 text-xs text-gray-500">
              ({node.meterCount}/32)
            </span>
          )}
        </span>
        
        {/* Simple context menu (add/remove favorite) */}
        {contextOpen && (
          <div
            style={{
              position: 'absolute',
              left: 60,
              top: 0,
              zIndex: 10,
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: 4,
              boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
              minWidth: 120,
              fontSize: 12,
              padding: '0.375rem 0.5rem'
            }}
            onMouseLeave={() => setContextOpen(false)}
          >
            <button
              className="flex items-center gap-2 px-2 py-1 text-xs hover:bg-blue-50 w-full text-left rounded"
              onClick={() => { onAddFavorite && onAddFavorite(node.name, isFavorite); setContextOpen(false); }}
            >
              {isFavorite ? (
                <StarIcon className="w-3 h-3 text-gray-400 mr-1" />
              ) : (
                <StarIcon className="w-3 h-3 text-yellow-400 mr-1" />
              )}
              {isFavorite ? 'Remove from favorite' : 'Add to favorite'}
            </button>
          </div>
        )}
      </div>
      
      {/* Render children */}
      {hasChildren && isExpanded && (
        <div className="relative">
          {node.children.map((child, idx) => {
            const isLastChild = idx === node.children.length - 1;
            const newParentLines = [...parentLines, !isLastChild];
            return (
              <ReadOnlyTreeNode
                key={child.id}
                node={child}
                level={level + 1}
                isLast={isLastChild}
                parentLines={newParentLines}
                onAddFavorite={onAddFavorite}
                favoriteList={favoriteList}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- สร้างข้อมูล tree สำหรับ PhysicalTree ---
function PhysicalTree({ rootNodes, setRootNodes, editingEnabled = true, createSystem = false, onSystemCreated = () => {}, treeType = "system", onAddFavoriteBuilding, onAddFavoriteOnline, refreshLocations, expanded = true, onOnlineStatusChange, selectedNodeId, setSelectedNodeId, setSelectedSlaveIds, setSelectedMeterNames }) {
  const [editingRootIndex, setEditingRootIndex] = useState<number|null>(null);
  const [rootInput, setRootInput] = useState('');
  const [editingChildIds, setEditingChildIds] = useState<{[key:string]: string|null}>({});
  // --- เพิ่ม state สำหรับ dialog ยืนยันลบ root node ---
  const [confirmDeleteIdx, setConfirmDeleteIdx] = useState<number|null>(null);
  const [confirmDeleteNodeId, setConfirmDeleteNodeId] = useState<string|null>(null);

  // --- ปรับ: ฟังก์ชันลบ root node หรือ child node ---
  const handleDeleteNode = async (idx: number, level: number, nodeId: string) => {
    console.log('🗑️ handleDeleteNode called:', { idx, level, nodeId });
    
    if (level === 0) {
      console.log('🔍 Root node delete - showing confirmation dialog');
      setConfirmDeleteIdx(idx);
      setConfirmDeleteNodeId(nodeId);
    } else {
      try {
        console.log('🗑️ Deleting child node from database:', nodeId);
        
        // ลบข้อมูลจาก database ตาม node type
        if (nodeId.startsWith('location-')) {
          const locationId = parseInt(nodeId.replace('location-', ''));
          console.log('🗑️ Deleting location with ID:', locationId);
          await meterTreeService.deleteLocation(locationId);
          console.log('✅ Location deleted successfully');
        } else if (nodeId.startsWith('lognet-')) {
          const lognetId = parseInt(nodeId.replace('lognet-', ''));
          console.log('🗑️ Deleting lognet with ID:', lognetId);
          await meterTreeService.deleteLogNet(lognetId);
          console.log('✅ LogNet deleted successfully');
        } else if (nodeId.startsWith('building-')) {
          const buildingId = parseInt(nodeId.replace('building-', ''));
          console.log('🗑️ Deleting building with ID:', buildingId);
          await meterTreeService.deleteBuilding(buildingId);
          console.log('✅ Building deleted successfully');
        } else if (nodeId.startsWith('floor-')) {
          const floorId = parseInt(nodeId.replace('floor-', ''));
          console.log('🗑️ Deleting floor with ID:', floorId);
          await meterTreeService.deleteFloor(floorId);
          console.log('✅ Floor deleted successfully');
        } else if (nodeId.startsWith('meter-')) {
          const meterId = parseInt(nodeId.replace('meter-', ''));
          console.log('🗑️ Deleting meter with ID:', meterId);
          await meterTreeService.deleteMeter(meterId);
          console.log('✅ Meter deleted successfully');
        } else {
          console.warn('⚠️ Unknown node type for deletion:', nodeId);
        }
        
        console.log('🔄 Refreshing locations after deletion');
        // Refresh locations จาก database เพื่อให้แสดง hierarchical structure ถูกต้อง
        if (refreshLocations) {
          await refreshLocations();
        }
        console.log('✅ Delete operation completed successfully');
      } catch (error) {
        console.error('❌ Error deleting node from database:', error);
      }
    }
  };

  // --- ฟังก์ชันยืนยันลบ root node ---
  const confirmDeleteRoot = async () => {
    console.log('🗑️ confirmDeleteRoot called:', { confirmDeleteIdx, confirmDeleteNodeId });
    
    if (confirmDeleteIdx !== null && confirmDeleteNodeId) {
      try {
        console.log('🗑️ Deleting root node from database:', confirmDeleteNodeId);
        
        // ลบข้อมูลจาก database ตาม node type
        if (confirmDeleteNodeId.startsWith('location-')) {
          const locationId = parseInt(confirmDeleteNodeId.replace('location-', ''));
          console.log('🗑️ Deleting root location with ID:', locationId);
          await meterTreeService.deleteLocation(locationId);
          console.log('✅ Root location deleted successfully');
        } else if (confirmDeleteNodeId.startsWith('lognet-')) {
          const lognetId = parseInt(confirmDeleteNodeId.replace('lognet-', ''));
          console.log('🗑️ Deleting root lognet with ID:', lognetId);
          await meterTreeService.deleteLogNet(lognetId);
          console.log('✅ Root lognet deleted successfully');
        } else if (confirmDeleteNodeId.startsWith('building-')) {
          const buildingId = parseInt(confirmDeleteNodeId.replace('building-', ''));
          console.log('🗑️ Deleting root building with ID:', buildingId);
          await meterTreeService.deleteBuilding(buildingId);
          console.log('✅ Root building deleted successfully');
        } else if (confirmDeleteNodeId.startsWith('floor-')) {
          const floorId = parseInt(confirmDeleteNodeId.replace('floor-', ''));
          console.log('🗑️ Deleting root floor with ID:', floorId);
          await meterTreeService.deleteFloor(floorId);
          console.log('✅ Root floor deleted successfully');
        } else if (confirmDeleteNodeId.startsWith('meter-')) {
          const meterId = parseInt(confirmDeleteNodeId.replace('meter-', ''));
          console.log('🗑️ Deleting root meter with ID:', meterId);
          await meterTreeService.deleteMeter(meterId);
          console.log('✅ Root meter deleted successfully');
        } else {
          console.warn('⚠️ Unknown root node type for deletion:', confirmDeleteNodeId);
        }
        
        console.log('🔄 Refreshing locations after root deletion');
        // Refresh locations จาก database เพื่อให้แสดง hierarchical structure ถูกต้อง
        if (refreshLocations) {
          await refreshLocations();
        }
        console.log('✅ Root delete operation completed successfully');
        setConfirmDeleteIdx(null);
        setConfirmDeleteNodeId(null);
      } catch (error) {
        console.error('❌ Error deleting root node from database:', error);
      setConfirmDeleteIdx(null);
      setConfirmDeleteNodeId(null);
      }
    }
  };
  const cancelDeleteRoot = () => {
    setConfirmDeleteIdx(null);
    setConfirmDeleteNodeId(null);
  };

  // --- ย้าย deleteNodeById มาจาก PhysicalTreeNode ---
  function deleteNodeById(tree: any, id: string): any {
    if (!tree.children) return tree;
    return { ...tree, children: tree.children.filter((c: any) => c.id !== id).map((c: any) => deleteNodeById(c, id)) };
  }

  useEffect(() => {
    if (createSystem) {
      setEditingRootIndex(rootNodes.length);
      setRootInput('');
      setRootNodes((prev: any[]) => [
        ...prev,
        { id: `system-${Date.now()}`, name: '', iconType: 'folder', children: [] }
      ]);
      onSystemCreated();
    }
  }, [createSystem, onSystemCreated, setRootNodes, rootNodes.length]);

  const handleRootSave = async (idx: number) => {
    if (rootInput.trim()) {
      try {
        console.log('🔄 Creating location in database:', rootInput.trim());
        console.log('🔄 Tree type:', treeType);
        console.log('🔄 RefreshLocations function:', refreshLocations);
        
        // ตรวจสอบว่าเป็น root location หรือ sub-location
        const currentNode = rootNodes[idx];
        const parentId = currentNode?.parentId || null;
        
        // บันทึกลง database
        const newLocation = await meterTreeService.createLocation({
          name: rootInput.trim(),
          description: `Location created from ${treeType} tree`,
          parent_id: parentId,
          tree_type: treeType
        });
        
        console.log('📊 New location response:', newLocation);
        
        if (newLocation) {
          console.log('✅ Location created successfully:', newLocation);
          
          // Refresh locations จาก database เพื่อให้แสดง hierarchical structure ถูกต้อง
          if (refreshLocations) {
            console.log('🔄 Calling refreshLocations...');
            await refreshLocations();
            console.log('✅ refreshLocations completed');
          } else {
            console.log('⚠️ refreshLocations function not available');
          }
        } else {
          console.log('❌ Failed to create location in database, using local state');
          // ถ้าบันทึก database ไม่สำเร็จ ให้ใช้ข้อมูล local
          setRootNodes((prev: any[]) => prev.map((sys, i) => 
            i === idx ? { ...sys, name: rootInput.trim(), iconType: 'folder' } : sys
          ));
        }
        setEditingRootIndex(null);
      } catch (error) {
        console.error('❌ Error saving location to database:', error);
        // ถ้าเกิด error ให้ใช้ข้อมูล local
        setRootNodes((prev: any[]) => prev.map((sys, i) => 
          i === idx ? { ...sys, name: rootInput.trim(), iconType: 'folder' } : sys
        ));
      setEditingRootIndex(null);
      }
    }
  };
  const handleRootCancel = () => {
    setEditingRootIndex(null);
    setRootInput('');
  };
  const handleEditRoot = (idx: number, name: string) => {
    setEditingRootIndex(idx);
    setRootInput(name);
  };

  // ฟังก์ชันอัปเดต root node ใน database
  const handleRootUpdate = async (idx: number) => {
    if (rootInput.trim()) {
      try {
        const node = rootNodes[idx];
        if (node.id.startsWith('location-')) {
          const locationId = parseInt(node.id.replace('location-', ''));
          await meterTreeService.updateLocation(locationId, {
            name: rootInput.trim(),
            description: `Location updated from ${treeType} tree`
          });
        }
        
        // Refresh locations จาก database เพื่อให้แสดง hierarchical structure ถูกต้อง
        if (refreshLocations) {
          await refreshLocations();
        }
        setEditingRootIndex(null);
      } catch (error) {
        console.error('Error updating root node in database:', error);
        // ถ้าเกิด error ให้ใช้ข้อมูล local
        setRootNodes((prev: any[]) => prev.map((sys, i) => 
          i === idx ? { ...sys, name: rootInput.trim() } : sys
        ));
        setEditingRootIndex(null);
      }
    }
  };

  // Handler for database icon click
  const handleCreateSystem = () => {
    setEditingRootIndex(rootNodes.length);
    setRootInput('');
    setRootNodes((prev: any[]) => [
      ...prev,
      { id: `system-${Date.now()}`, name: '', iconType: 'folder', children: [] }
    ]);
  };

  // Use editingEnabled to disable editing features if false
  return (
    <div className="text-xs">
      {/* Dialog ยืนยันลบ root node */}
      <Dialog open={confirmDeleteIdx !== null}>
        <DialogContent className="max-w-xs">
          <div className="font-semibold text-base mb-2">Delete Location?</div>
          <div className="mb-4 text-sm">Are you sure you want to delete this location? This action cannot be undone.</div>
          <div className="flex gap-2 justify-end">
            <button className="px-3 py-1 rounded-none bg-gray-200 text-gray-700 hover:bg-gray-300" onClick={cancelDeleteRoot}>Cancel</button>
            <button className="px-3 py-1 rounded-none bg-red-600 text-white hover:bg-red-700" onClick={confirmDeleteRoot}>Delete</button>
          </div>
        </DialogContent>
      </Dialog>
      {rootNodes.map((system, idx) => (
        <div key={system.id} className="mb-2">
          {editingRootIndex === idx ? (
            <div className="flex items-center gap-2 px-2 py-1">
              <input
                className="border border-gray-300 rounded-none px-2 py-1 text-xs"
                value={rootInput}
                onChange={e => setRootInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleRootSave(idx);
                  if (e.key === 'Escape') handleRootCancel();
                }}
                autoFocus
                placeholder="Location Name"
              />
              <button className="bg-primary text-white px-2 py-1 rounded-none text-xs" onClick={() => {
                if (rootNodes[idx].id.startsWith('location-')) {
                  handleRootUpdate(idx);
                } else {
                  handleRootSave(idx);
                }
              }}>Save</button>
              <button className="bg-gray-200 text-gray-700 px-2 py-1 rounded-none text-xs" onClick={handleRootCancel}>Cancel</button>
            </div>
          ) : (
            <PhysicalTreeNode
              node={system}
              setRootNode={editingEnabled ? (updater => setRootNodes(prev => prev.map((sys, i) => i === idx ? updater(sys) : sys))) : undefined}
              level={0}
              editingChildId={editingChildIds[system.id] || null}
              setEditingChildId={id => setEditingChildIds(prev => ({ ...prev, [system.id]: id }))}
              readOnly={!editingEnabled}
              onEditRoot={() => handleEditRoot(idx, system.name)}
              onDelete={(nodeId: string, nodeLevel: number) => handleDeleteNode(idx, nodeLevel, nodeId)}
              treeType={treeType}
              onAddFavoriteBuilding={onAddFavoriteBuilding}
              selectedNodeId={selectedNodeId}
              setSelectedNodeId={setSelectedNodeId}
              setSelectedSlaveIds={setSelectedSlaveIds}
              setSelectedMeterNames={setSelectedMeterNames}
              onAddFavoriteOnline={onAddFavoriteOnline}
              refreshLocations={refreshLocations}
              expanded={expanded}
              onOnlineStatusChange={onOnlineStatusChange}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// Add a filter for enabled nodes for Online Meter Tree
function filterEnabledTree(node) {
  if (!node) return null;
  // Only filter meter nodes (icon === meterIcon or Gauge)
  const isMeterNode = node.iconType === 'meter';
  if (isMeterNode && node.enabled === false) return null;
  // Filter out meters that are disabled for online view
  if (isMeterNode && node.onlineEnabled === false) return null;
  const children = node.children ? node.children.map(filterEnabledTree).filter(Boolean) : [];
  return { ...node, children };
}

function MeterTreeLegendContent() {
  return (
    <div className="text-xs min-w-[220px]">
      <div className="mb-1 font-semibold">LEGENDS :</div>
      <div className="flex items-center mb-1">
        <MdDomain className="inline w-4 h-4 text-primary mr-2" />
        <span className="align-middle">1<sup>st</sup> Level - Location of Switchboards</span>
      </div>
      <div className="flex items-center mb-1">
        <FolderOpen className="inline w-4 h-4 text-gray-700 mr-2" />
        <span className="align-middle">2<sup>nd</sup> Level - Name of Switchboards + Display of all DPMs</span>
      </div>
      <div className="flex items-center mb-1">
        <MdOutlineStairs className="inline w-4 h-4 text-green-500 mr-2" />
        <span className="align-middle">2<sup>nd</sup> Level - Location of Switchboards</span>
      </div>
      <div className="flex items-center">
        <span className="inline-flex items-center justify-center bg-blue-400 rounded mr-2" style={{ width: 16, height: 16 }}>
          <Gauge className="w-3 h-3 text-white" />
        </span>
        <span className="align-middle">3<sup>rd</sup> Level - Name of Switchboards & Display of individual DPMs</span>
      </div>
    </div>
  );
}

// Collapsible Favorite Section
function CollapsibleFavorite({ title, items, color, onRemoveFavorite }: { title: string, items: string[], color: string, onRemoveFavorite?: (name: string) => void }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mt-2">
      <button
        className={`flex items-center gap-1 font-semibold text-${color}-600 text-xs mb-1 focus:outline-none select-none`}
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        style={{ userSelect: 'none' }}
      >
        {open ? <ChevronDown className={`w-4 h-4 text-${color}-400`} /> : <ChevronRight className={`w-4 h-4 text-${color}-400`} />}
        <Star className={`w-4 h-4 text-${color}-400 fill-${color}-200`} />
        {title}
      </button>
      {open && (
        <div className="space-y-1">
          {items.map((item, i) => (
            <div key={item} className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-600 rounded flex items-center justify-center">
                  <Gauge className="w-2 h-2 text-white" />
                </div>
                <span>{item}</span>
              </div>
              {onRemoveFavorite && (
                <button 
                  className="ml-1 text-gray-400 hover:text-red-500" 
                  onClick={() => onRemoveFavorite(item)}
                  title="Remove from favorites"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
          </div>
          ))}
        </div>
      )}
    </div>
  );
}

// FavoritePlacement: expands below legend, collapses at bottom
function FavoritePlacement({ title, items, color, onRemoveFavorite, loading = false }: { title: string, items: string[], color: string, onRemoveFavorite?: (name: string) => void, loading?: boolean }) {
  const [open, setOpen] = useState(true);
  const favoriteSection = (
    <div className="mt-2">
      <button
        className={`flex items-center gap-1 font-semibold text-${color}-600 text-xs mb-1 focus:outline-none select-none`}
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        style={{ userSelect: 'none' }}
      >
        {open ? <ChevronDown className={`w-4 h-4 text-${color}-400`} /> : <ChevronRight className={`w-4 h-4 text-${color}-400`} />}
        <Star className={`w-4 h-4 text-${color}-400 fill-${color}-200`} />
        {title}
      </button>
      {open && (
        <div className="space-y-1 bg-gray-100 rounded px-2 py-2 mt-1 flex-1 min-h-[200px] max-h-[300px] overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-gray-500 text-sm">🔄 Loading favorites...</div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-gray-500 text-sm">No favorite meters</div>
            </div>
          ) : (
            items.map((item, i) => (
              <div key={item} className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-blue-600 rounded flex items-center justify-center">
                    <Gauge className="w-2 h-2 text-white" />
                  </div>
                  <span>{item}</span>
                </div>
                {onRemoveFavorite && (
                  <button 
                    className="ml-1 text-gray-400 hover:text-red-500" 
                    onClick={() => onRemoveFavorite(item)}
                    title="Remove from favorites"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
            </div>
            ))
          )}
        </div>
      )}
    </div>
  );
  if (open) {
    // Expanded: render right after legend
    return favoriteSection;
  }
  // Collapsed: push to bottom
  return <div className="flex-1 flex flex-col justify-end">{favoriteSection}</div>;
}

// Modal สำหรับเลือกมิเตอร์จาก database
function SelectMeterModal({ isOpen, onClose, onSelect, treeType }: { 
  isOpen: boolean, 
  onClose: () => void, 
  onSelect: (meter: any) => void,
  treeType: string 
}) {
  const [meters, setMeters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadMeters();
    }
  }, [isOpen]);

  const loadMeters = async () => {
    setLoading(true);
    try {
      const allMeters = await meterTreeService.getMeters();
      console.log('🔧 Sample meter data from API:', allMeters[0]); // Debug: ดูข้อมูล meter ตัวอย่าง
      
      // กรองมิเตอร์ตาม tree_type หรือมิเตอร์ที่ยังไม่ได้ใช้ใน tree นี้
      const filteredMeters = allMeters.filter(meter => {
        if (treeType === 'building') {
          // สำหรับ Building tree ให้เลือกมิเตอร์ที่ไม่ได้อยู่ใน Building tree อื่น
          return !meter.floor_id; // หรือใช้เงื่อนไขอื่นตามโครงสร้าง
        } else if (treeType === 'online') {
          // สำหรับ Online tree ให้เลือกมิเตอร์ที่ไม่ได้อยู่ใน Online tree อื่น
          return !meter.lognet_id; // หรือใช้เงื่อนไขอื่นตามโครงสร้าง
        }
        return true;
      });
      setMeters(filteredMeters);
    } catch (error) {
      console.error('Error loading meters:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMeters = meters.filter(meter =>
    meter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    meter.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    meter.model?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">

        </div>
        
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search Meters..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-gray-500">🔄 Loading Meters...</div>
            </div>
          ) : filteredMeters.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No meters found
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMeters.map((meter) => (
                <div
                  key={meter.id}
                  onClick={() => onSelect(meter)}
                  className="p-3 border border-gray-200 rounded cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="inline-flex items-center justify-center bg-blue-400 rounded mr-3" style={{ width: 20, height: 20 }}>
                        <Gauge className="w-4 h-4 text-white" />
                      </span>
                      <div>
                        <div className="font-medium">{meter.name}</div>
                        <div className="text-sm text-gray-500">
                          {meter.brand} {meter.model} - {meter.meter_sn}
                        </div>
                      </div>
                    </div>
                                                        <div className="text-sm text-gray-400">
                                      Slave ID: {meter.slave_id || 'N/A'}
                                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function MeterTree() {
  const { toast } = useToast();
  
  // Permissions
  const { permissions: userPermissions } = usePermissions();
  const meterTreePermissions = userPermissions?.['Meter Tree'] || { read: false, write: false, report: false };
  
  console.log('📝 Meter Tree Permissions:', meterTreePermissions);
  
  const { 
    systemNodes, 
    setSystemNodes, 
    buildingNodes,
    setBuildingNodes,
    onlineNodes,
    setOnlineNodes,
    selectedNodeId,
    setSelectedNodeId,
    selectedSlaveIds,
    setSelectedSlaveIds,
    selectedMeterNames,
    setSelectedMeterNames,
    loading,
    refreshSystemTree,
    refreshBuildingTree,
    refreshOnlineTree
  } = useMeterTree();

  // State สำหรับการย่อ/กาง tree
  const [systemTreeExpanded, setSystemTreeExpanded] = useState(true);
  const [buildingTreeExpanded, setBuildingTreeExpanded] = useState(true);
  const [onlineTreeExpanded, setOnlineTreeExpanded] = useState(true);

  // Show loading toast when loading state changes
  useEffect(() => {
    if (loading) {
      toast({
        title: "Loading Data",
        description: "🔄 Loading locations from database...",
        duration: 2000,
      });
    }
  }, [loading, toast]);

  // Debug systemNodes changes
  useEffect(() => {
    console.log('🔄 systemNodes changed:', systemNodes);
    console.log('🔍 selectedNodeId from context:', selectedNodeId);
    console.log('🔧 setSelectedNodeId function from context:', setSelectedNodeId);
  }, [systemNodes, selectedNodeId, setSelectedNodeId]);

  // Functions สำหรับการย่อ/กาง tree
  const handleToggleSystemTree = () => {
    setSystemTreeExpanded(prev => !prev);
  };

  const handleToggleBuildingTree = () => {
    setBuildingTreeExpanded(prev => !prev);
  };

  const handleToggleOnlineTree = () => {
    setOnlineTreeExpanded(prev => !prev);
  };

  // Function ที่ refresh ทั้ง Building และ Online tree พร้อมกัน
  const refreshBuildingAndOnlineTree = async () => {
    console.log('🔄 Refreshing both Building and Online trees');
    await Promise.all([
      refreshBuildingTree(),
      refreshOnlineTree()
    ]);
    console.log('✅ Both Building and Online trees refreshed');
  };
  
  // State สำหรับการสร้างระบบในแต่ละส่วน
  const [createSystemSystem, setCreateSystemSystem] = useState(false);
  const [createSystemBuilding, setCreateSystemBuilding] = useState(false);
  const [createSystemOnline, setCreateSystemOnline] = useState(false);
  
  const [favoriteBuilding, setFavoriteBuilding] = useState<string[]>([]);
  const [favoriteOnline, setFavoriteOnline] = useState<string[]>([]);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  
  // Excel import states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState<any>(null);
  
  // Handlers สำหรับแต่ละส่วน
  const handleCreateSystemSystem = () => setCreateSystemSystem(true);
  const handleSystemCreatedSystem = () => setCreateSystemSystem(false);
  
  const handleCreateSystemBuilding = () => setCreateSystemBuilding(true);
  const handleSystemCreatedBuilding = () => setCreateSystemBuilding(false);
  
  const handleCreateSystemOnline = () => setCreateSystemOnline(true);
  const handleSystemCreatedOnline = () => setCreateSystemOnline(false);

  // Excel import handlers
  const handleImportExcel = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          console.log('📁 Selected file:', file.name);
          
          // Show loading toast
          toast({
            title: "Importing Excel File",
            description: `Processing ${file.name}...`,
            duration: 3000,
          });

          // Import Excel parser
          const { parseExcelFile, createTreeFromExcelData } = await import('@/utils/excelParser');
          
          // Parse Excel file
          console.log('📊 Parsing Excel file...');
          const parsedData = await parseExcelFile(file);
          
          if (parsedData.errors.length > 0) {
            console.warn('⚠️ Excel parsing warnings:', parsedData.errors);
          }
          
          console.log('✅ Excel parsed successfully:', {
            systemTree: parsedData.systemTree.length,
            buildingTree: parsedData.buildingTree.length,
            errors: parsedData.errors.length
          });
          
          // Debug: แสดงข้อมูลที่ parse ได้
          if (parsedData.systemTree.length > 0) {
            console.log('🔍 System tree data sample:', parsedData.systemTree[0]);
          }
          if (parsedData.buildingTree.length > 0) {
            console.log('🔍 Building tree data sample:', parsedData.buildingTree[0]);
          }
          
          // Show import options modal
          setShowImportModal(true);
          setImportData(parsedData);
          
        } catch (error) {
          console.error('❌ Error parsing Excel file:', error);
          toast({
            title: "Import Error",
            description: `Failed to parse Excel file: ${error.message}`,
            variant: "destructive",
            duration: 5000,
          });
        }
      }
    };
    input.click();
  };

  // Handle Excel import confirmation
  const handleConfirmImport = async (treeType: 'system' | 'building') => {
    if (!importData) return;
    
    try {
      setShowImportModal(false);
      
      // Show loading toast
      toast({
        title: "Creating Tree Structure",
        description: `Creating ${treeType} tree from Excel data...`,
        duration: 3000,
      });
      
      // Import Excel parser
      const { createTreeFromExcelData } = await import('@/utils/excelParser');
      
      // Select appropriate data
      const dataToImport = treeType === 'system' ? importData.systemTree : importData.buildingTree;
      
      if (dataToImport.length === 0) {
        toast({
          title: "No Data Found",
          description: `No ${treeType} tree data found in Excel file`,
          variant: "destructive",
          duration: 5000,
        });
        return;
      }
      
      console.log(`🌳 Creating ${treeType} tree with ${dataToImport.length} meters`);
      console.log('🔍 Data to import sample:', dataToImport[0]);
      console.log('🔍 MeterTreeService available methods:', Object.keys(meterTreeService));
      
      // Create tree structure
      const result = await createTreeFromExcelData(dataToImport, treeType, meterTreeService);
      
      console.log('🔍 Tree creation result:', result);
      
      if (result.success) {
        console.log('✅ Tree creation successful:', result);
        
        // Show success message
        toast({
          title: "Import Successful",
          description: result.message,
          duration: 5000,
        });
        
        // Refresh appropriate trees
        if (treeType === 'system') {
          await refreshSystemTree();
        } else {
          await Promise.all([
            refreshBuildingTree(),
            refreshOnlineTree()
          ]);
        }
        
        console.log('🔄 Trees refreshed after import');
      } else {
        console.error('❌ Tree creation failed:', result);
        toast({
          title: "Import Failed",
          description: result.message,
          variant: "destructive",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('❌ Error creating tree from Excel:', error);
      toast({
        title: "Import Error",
        description: `Failed to create tree: ${error.message}`,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setImportData(null);
    }
  };

  // Handle download Excel template
  const handleDownloadTemplate = async () => {
    try {
      console.log('📥 Downloading Excel template...');
      
      // Show loading toast
      toast({
        title: "Downloading Template",
        description: "Preparing Excel template file...",
        duration: 2000,
      });

      // Import template utility
      const { downloadTemplate } = await import('@/utils/excelTemplate');
      
      // Download combined template (includes both System and Building Tree)
      downloadTemplate('combined');
      
      // Show success message
      toast({
        title: "Template Downloaded",
        description: "Excel template downloaded successfully! Check your Downloads folder.",
        duration: 5000,
      });

      console.log('✅ Excel template downloaded successfully');
    } catch (error) {
      console.error('❌ Error downloading template:', error);
      toast({
        title: "Download Error",
        description: 'Failed to download Excel template. Please try again.',
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  // Load favorite meters from localStorage
  const loadFavoriteMeters = () => {
    try {
      console.log('🔄 Loading favorite meters from localStorage...');
      
      // ดึงข้อมูล favorites จาก localStorage
      const buildingFavorites = JSON.parse(localStorage.getItem('favoriteBuilding') || '[]');
      const onlineFavorites = JSON.parse(localStorage.getItem('favoriteOnline') || '[]');
      
      setFavoriteBuilding(buildingFavorites);
      setFavoriteOnline(onlineFavorites);
      
      console.log('✅ Favorite meters loaded from localStorage:', { buildingFavorites, onlineFavorites });
    } catch (error) {
      console.error('❌ Error loading favorite meters from localStorage:', error);
      // ถ้าเกิด error ให้ใช้ค่า default
      setFavoriteBuilding([]);
      setFavoriteOnline([]);
    }
  };

  // Load favorites on component mount
  useEffect(() => {
    loadFavoriteMeters();
  }, []);

  // Add/remove favorite handlers
  const handleAddFavoriteBuilding = (meterName: string, isFavorite: boolean) => {
    try {
      console.log('🔄 handleAddFavoriteBuilding called:', meterName, isFavorite);
      
      if (isFavorite) {
        // Remove from favorites
        setFavoriteBuilding(prev => {
          const newFavorites = prev.filter(n => n !== meterName);
          localStorage.setItem('favoriteBuilding', JSON.stringify(newFavorites));
          return newFavorites;
        });
        toast({
          title: "Removed from Favorites",
          description: `"${meterName}" removed from Building favorites`,
          duration: 2000,
        });
      } else {
        // Add to favorites
        setFavoriteBuilding(prev => {
          const newFavorites = [...prev, meterName];
          localStorage.setItem('favoriteBuilding', JSON.stringify(newFavorites));
          return newFavorites;
        });
        toast({
          title: "Added to Favorites",
          description: `"${meterName}" added to Building favorites`,
          duration: 2000,
        });
      }
    } catch (error) {
      console.error('❌ Error handling building favorite:', error);
    }
  };

  const handleAddFavoriteOnline = (meterName: string, isFavorite: boolean) => {
    try {
      console.log('🔄 handleAddFavoriteOnline called:', meterName, isFavorite);
      
      if (isFavorite) {
        // Remove from favorites
        setFavoriteOnline(prev => {
          const newFavorites = prev.filter(n => n !== meterName);
          localStorage.setItem('favoriteOnline', JSON.stringify(newFavorites));
          return newFavorites;
        });
        toast({
          title: "Removed from Favorites",
          description: `"${meterName}" removed from Online favorites`,
          duration: 2000,
        });
      } else {
        // Add to favorites
        setFavoriteOnline(prev => {
          const newFavorites = [...prev, meterName];
          localStorage.setItem('favoriteOnline', JSON.stringify(newFavorites));
          return newFavorites;
        });
        toast({
          title: "Added to Favorites",
          description: `"${meterName}" added to Online favorites`,
          duration: 2000,
        });
      }
    } catch (error) {
      console.error('❌ Error handling online favorite:', error);
    }
  };

  // Remove favorite handlers
  const handleRemoveFavoriteBuilding = (name: string) => {
    try {
      console.log('🔄 Removing from Building favorites:', name);
      
      setFavoriteBuilding(prev => {
        const newFavorites = prev.filter(n => n !== name);
        localStorage.setItem('favoriteBuilding', JSON.stringify(newFavorites));
        return newFavorites;
      });
      
      toast({
        title: "Removed from Favorites",
        description: `"${name}" removed from Building favorites`,
        duration: 2000,
      });
    } catch (error) {
      console.error('❌ Error removing building favorite:', error);
    }
  };

  const handleRemoveFavoriteOnline = (name: string) => {
    try {
      console.log('🔄 Removing from Online favorites:', name);
      
      setFavoriteOnline(prev => {
        const newFavorites = prev.filter(n => n !== name);
        localStorage.setItem('favoriteOnline', JSON.stringify(newFavorites));
        return newFavorites;
      });
      
      toast({
        title: "Removed from Favorites",
        description: `"${name}" removed from Online favorites`,
        duration: 2000,
      });
    } catch (error) {
      console.error('❌ Error removing online favorite:', error);
    }
  };

  // Online status change handler
  const handleOnlineStatusChange = (meterName: string, isEnabled: boolean) => {
    toast({
      title: isEnabled ? "Meter Enabled for Online" : "Meter Disabled for Online",
      description: `Meter "${meterName}" has been ${isEnabled ? 'enabled' : 'disabled'} for online view.`,
      duration: 3000,
    });
  };



  return (
    <PageLayout>
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-9xl mx-auto">
          <div className="bg-white rounded-none shadow-sm">
            <div className="flex items-center gap-2 p-4">
              <Wrench className="w-5 h-5" style={{ color: '#1A357D' }} />
              <h1 className="text-lg font-semibold text-gray-900">Meter Tree Config</h1>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="ml-2 p-1 rounded-full hover:bg-blue-50 focus:outline-none" title="Information">
                    <Info className="w-5 h-5 text-blue-500" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="shadow-lg border border-blue-200 bg-white">
                  <MeterTreeLegendContent />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 h-full min-h-0 p-4 pt-0">
              {/* Physical Meter Tree (editable) */}
              <div className="border border-gray-200 bg-white p-2 flex flex-col flex-1 min-h-[575px] shadow-sm">
                <div className="font-semibold text-black mb-3 flex items-center justify-between text-sm">
                  <span className="text-sm">Meter Tree System</span>
                  <div className="flex items-center gap-1">
                    <button className="p-0.5 rounded hover:bg-gray-100 relative" title={!meterTreePermissions.write ? "You don't have write permission for Meter Tree" : "Add Location"} onClick={meterTreePermissions.write ? handleCreateSystemSystem : undefined} disabled={!meterTreePermissions.write} style={{ width: 22, height: 22, opacity: !meterTreePermissions.write ? 0.5 : 1 }}>
                      <MdDomainAdd className="w-5 h-5 text-primary"/>
                    </button>
                    <button className="p-0.5 rounded hover:bg-gray-100 relative" title={!meterTreePermissions.write ? "You don't have write permission for Meter Tree" : "Download Template"} onClick={meterTreePermissions.write ? handleDownloadTemplate : undefined} disabled={!meterTreePermissions.write} style={{ width: 22, height: 22, opacity: !meterTreePermissions.write ? 0.5 : 1 }}>
                      <div className="relative w-4 h-4">
                        <FaRegFileExcel className="w-4 h-4 text-blue-600 drop-shadow" />
                        <ArrowDown className="w-2 h-2 text-blue-700 absolute -top-0.5 -right-0.5 bg-white rounded-full" style={{ fontSize: '8px' }} />
                      </div>
                    </button>
                    <button className="p-0.5 rounded hover:bg-gray-100 relative" title={!meterTreePermissions.write ? "You don't have write permission for Meter Tree" : "Import from File"} onClick={meterTreePermissions.write ? handleImportExcel : undefined} disabled={!meterTreePermissions.write} style={{ width: 22, height: 22, opacity: !meterTreePermissions.write ? 0.5 : 1 }}>
                      <div className="relative w-4 h-4">
                        <FaRegFileExcel className="w-4 h-4 text-green-600 drop-shadow" />
                        <Plus className="w-2 h-2 text-green-700 absolute -top-0.5 -right-0.5 bg-white rounded-full" style={{ fontSize: '8px' }} />
                      </div>
                    </button>
                    <button className="hover:text-blue-500" onClick={handleToggleSystemTree} title={systemTreeExpanded ? "Collapse All" : "Expand All"}>
                      {systemTreeExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <PhysicalTree rootNodes={systemNodes} setRootNodes={setSystemNodes} editingEnabled={true} createSystem={createSystemSystem} onSystemCreated={handleSystemCreatedSystem} treeType="system" onAddFavoriteBuilding={handleAddFavoriteBuilding} onAddFavoriteOnline={handleAddFavoriteOnline} refreshLocations={refreshSystemTree} expanded={systemTreeExpanded} onOnlineStatusChange={handleOnlineStatusChange} selectedNodeId={selectedNodeId} setSelectedNodeId={setSelectedNodeId} setSelectedSlaveIds={setSelectedSlaveIds} setSelectedMeterNames={setSelectedMeterNames} />
                <div className="flex-1" />
              </div>
              {/* Meter Tree Building (editable) */}
              <div className="border border-gray-200 bg-white p-2 flex flex-col flex-1 min-h-[575px] shadow-sm">
                <div className="font-semibold text-black mb-3 flex items-center justify-between text-sm">
                  <span className="text-sm">Meter Tree Building</span>
                  <div className="flex items-center gap-1">
                    <button className="p-0.5 rounded hover:bg-gray-100 relative" title={!meterTreePermissions.write ? "You don't have write permission for Meter Tree" : "Add Location"} onClick={meterTreePermissions.write ? handleCreateSystemBuilding : undefined} disabled={!meterTreePermissions.write} style={{ width: 22, height: 22, opacity: !meterTreePermissions.write ? 0.5 : 1 }}>
                      <MdDomainAdd className="w-5 h-5 text-primary"/>
                    </button>
                    <button className="p-0.5 rounded hover:bg-gray-100 relative" title={!meterTreePermissions.write ? "You don't have write permission for Meter Tree" : "Download Template"} onClick={meterTreePermissions.write ? handleDownloadTemplate : undefined} disabled={!meterTreePermissions.write} style={{ width: 22, height: 22, opacity: !meterTreePermissions.write ? 0.5 : 1 }}>
                      <div className="relative w-4 h-4">
                        <FaRegFileExcel className="w-4 h-4 text-blue-600 drop-shadow" />
                        <ArrowDown className="w-2 h-2 text-blue-700 absolute -top-0.5 -right-0.5 bg-white rounded-full" style={{ fontSize: '8px' }} />
                      </div>
                    </button>
                    <button className="p-0.5 rounded hover:bg-gray-100 relative" title={!meterTreePermissions.write ? "You don't have write permission for Meter Tree" : "Import from File"} onClick={meterTreePermissions.write ? handleImportExcel : undefined} disabled={!meterTreePermissions.write} style={{ width: 22, height: 22, opacity: !meterTreePermissions.write ? 0.5 : 1 }}>
                      <div className="relative w-4 h-4">
                        <FaRegFileExcel className="w-4 h-4 text-green-600 drop-shadow" />
                        <Plus className="w-2 h-2 text-green-700 absolute -top-0.5 -right-0.5 bg-white rounded-full" style={{ fontSize: '8px' }} />
                      </div>
                    </button>
                    <button className="hover:text-blue-500" onClick={handleToggleBuildingTree} title={buildingTreeExpanded ? "Collapse All" : "Expand All"}>
                      {buildingTreeExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 flex flex-col min-h-0 h-full">
                  <PhysicalTree rootNodes={buildingNodes} setRootNodes={setBuildingNodes} editingEnabled={true} createSystem={createSystemBuilding} onSystemCreated={handleSystemCreatedBuilding} treeType="building" onAddFavoriteBuilding={handleAddFavoriteBuilding} onAddFavoriteOnline={handleAddFavoriteOnline} refreshLocations={refreshBuildingAndOnlineTree} expanded={buildingTreeExpanded} onOnlineStatusChange={handleOnlineStatusChange} selectedNodeId={selectedNodeId} setSelectedNodeId={setSelectedNodeId} setSelectedSlaveIds={setSelectedSlaveIds} setSelectedMeterNames={setSelectedMeterNames} />
                  <FavoritePlacement
                    title="Favorite Meter Tree Building"
                    color="blue"
                    items={favoriteBuilding}
                    onRemoveFavorite={handleRemoveFavoriteBuilding}
                    loading={favoriteLoading}
                  />
                </div>
              </div>
              {/* Online Meter Tree (read-only, only favorite functionality) */}
              <div id="online-tree-section" className="border border-gray-200 bg-white p-2 flex flex-col flex-1 min-h-[575px] shadow-sm">
                <div className="font-semibold text-black mb-3 flex items-center justify-between text-sm">
                  <span className="text-sm">Meter Tree Online </span>
                  <div className="flex items-center gap-1">
                    <button className="hover:text-blue-500" onClick={handleToggleOnlineTree} title={onlineTreeExpanded ? "Collapse All" : "Expand All"}>
                      {onlineTreeExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex-1 flex flex-col min-h-0 h-full">
                  <PhysicalTree rootNodes={onlineNodes} setRootNodes={setOnlineNodes} editingEnabled={false} createSystem={false} onSystemCreated={() => {}} treeType="online" onAddFavoriteBuilding={handleAddFavoriteBuilding} onAddFavoriteOnline={handleAddFavoriteOnline} refreshLocations={refreshOnlineTree} expanded={onlineTreeExpanded} onOnlineStatusChange={handleOnlineStatusChange} selectedNodeId={selectedNodeId} setSelectedNodeId={setSelectedNodeId} setSelectedSlaveIds={setSelectedSlaveIds} setSelectedMeterNames={setSelectedMeterNames} />
                  <FavoritePlacement
                    title="Favorite Online Meter Tree"
                    color="green"
                    items={favoriteOnline}
                    onRemoveFavorite={handleRemoveFavoriteOnline}
                    loading={favoriteLoading}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Excel Import Modal */}
      {showImportModal && importData && (
        <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
          <DialogContent className="max-w-2xl">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
                Excel Import Options
              </h2>
              
              <div className="space-y-4">
                {/* Help Text */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Need a template?</p>
                      <p>Click the <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        <FaRegFileExcel className="w-3 h-3 mr-1" />
                        Download Template
                      </span> button to get an Excel template with examples and instructions.</p>
                    </div>
                  </div>
                </div>

                {/* Import Summary */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Import Summary:</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">System Tree Data:</span>
                      <span className="ml-2">{importData.systemTree.length} meters</span>
                    </div>
                    <div>
                      <span className="font-medium">Building Tree Data:</span>
                      <span className="ml-2">{importData.buildingTree.length} meters</span>
                    </div>
                  </div>
                  
                  {importData.errors.length > 0 && (
                    <div className="mt-3">
                      <span className="font-medium text-orange-600">Warnings:</span>
                      <ul className="list-disc list-inside text-sm text-orange-600 mt-1">
                        {importData.errors.slice(0, 5).map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                        {importData.errors.length > 5 && (
                          <li>... and {importData.errors.length - 5} more warnings</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Import Options */}
                <div className="space-y-3">
                  <h3 className="font-medium">Choose Import Type:</h3>
                  
                  {importData.systemTree.length > 0 && (
                    <button
                      onClick={() => handleConfirmImport('system')}
                      className="w-full p-4 border-2 border-blue-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-left"
                      disabled={!meterTreePermissions.write}
                      title={!meterTreePermissions.write ? "You don't have write permission for Meter Tree" : ""}
                    >
                      <div className="flex items-center gap-3">
                        <Server className="h-5 w-5 text-blue-600" />
                        <div>
                          <div className="font-medium">Import as System Tree</div>
                          <div className="text-sm text-gray-600">
                            Location → LogNet → Meter structure ({importData.systemTree.length} meters)
                          </div>
                        </div>
                      </div>
                    </button>
                  )}
                  
                  {importData.buildingTree.length > 0 && (
                    <button
                      onClick={() => handleConfirmImport('building')}
                      className="w-full p-4 border-2 border-green-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors text-left"
                      disabled={!meterTreePermissions.write}
                      title={!meterTreePermissions.write ? "You don't have write permission for Meter Tree" : ""}
                    >
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-green-600" />
                        <div>
                          <div className="font-medium">Import as Building Tree</div>
                          <div className="text-sm text-gray-600">
                            Location → Building → Floor → Meter structure ({importData.buildingTree.length} meters)
                          </div>
                        </div>
                      </div>
                    </button>
                  )}
                </div>

                {/* Cancel Button */}
                <div className="flex justify-end pt-4 border-t">
                  <button
                    onClick={() => {
                      setShowImportModal(false);
                      setImportData(null);
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </PageLayout>
  );
}