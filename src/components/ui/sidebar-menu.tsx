import React, { useState, createContext, useContext, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useMeterTree } from '@/context/MeterTreeContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronRight,
  Star,
  Menu,
  X,
  Table,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Folder,
  Gauge,
  Square,
  Thermometer,
  XCircle
} from 'lucide-react';
import { BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem
} from '@/components/ui/context-menu';
import { MdDomain, MdOutlineStairs } from 'react-icons/md';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  allowedColumns?: string[];
  maxSelectedColumns?: number;
  fixedColumns?: string[];
}

function getIcon(iconType: string, isSystemNode = false) {
  if (isSystemNode) return <MdDomain className="inline w-4 h-4 mr-1 text-primary" />;
  switch (iconType) {
    case 'meter':
      return <span className="inline-flex items-center justify-center bg-blue-400 rounded" style={{ width: 14, height: 14, marginRight: 3 }}><Gauge className="w-2.5 h-2.5 text-white" /></span>;
    case 'folder':
      return <Folder className="inline w-3.5 h-3.5 text-gray-700 mr-1" />;
    case 'port':
      return <Folder className="inline w-3.5 h-3.5 text-blue-400 mr-1" />;
    case 'floor':
      return <MdOutlineStairs className="inline w-3.5 h-3.5 text-green-500 mr-1" />;
    case 'temp':
      return <Thermometer className="inline w-2.5 h-2.5 text-pink-400 mr-1" />;
    default:
      return <span className="inline-block w-2.5 h-2.5 bg-gray-300 rounded-none mr-1" />;
  }
}

function TreeNode({ node, level = 0, isLast = false, parentLines = [], onAddFavorite, favoriteMeters = [], selectedMeterIds, setSelectedMeterIds, isTableDataPage, setSelectedSlaveIds, setSelectedMeterNames }: any) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [contextOpen, setContextOpen] = useState(false);
  const { selectedNodeId, setSelectedNodeId } = useMeterTree ? useMeterTree() : { selectedNodeId: undefined, setSelectedNodeId: undefined };
  const hasChildren = node.children && node.children.length > 0;
  const INDENT = 16; // ลดจาก 24 เป็น 16
  const LINE_OFFSET = 8; // ลดจาก 12 เป็น 8
  const NODE_HEIGHT = 20; // ลดจาก 24 เป็น 20
  const isMeterNode = node.iconType === 'meter';
  const isFolderNode = node.iconType === 'folder';
  const isPortNode = node.iconType === 'port';
  const isSystemNode = level === 0;
  const isFavorite = favoriteMeters && favoriteMeters.includes(node.name);

  return (
    <div className="relative" style={{ minHeight: NODE_HEIGHT }}>
      {/* Parent vertical lines */}
      {parentLines.map((shouldShowLine, index) =>
        shouldShowLine ? (
          <div
            key={index}
            className="absolute border-l border-gray-300"
            style={{
              left: `${index * INDENT + LINE_OFFSET}px`,
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
            className="absolute border-l border-gray-300"
            style={{
              left: `${(level - 1) * INDENT + LINE_OFFSET}px`,
              top: 0,
              height: `${NODE_HEIGHT / 2 + 2}px`,
              zIndex: 0
            }}
          />
          {/* เส้นนอนจากเส้นตั้งไปยัง icon */}
          <div
            className="absolute border-t border-gray-300"
            style={{
              left: `${(level - 1) * INDENT + LINE_OFFSET}px`,
              top: `${NODE_HEIGHT / 2 + 1}px`,
              width: `${INDENT - 4}px`,
              zIndex: 0
            }}
          />
        </>
      )}
      <div
        className={`flex items-center space-x-1 py-0.5 px-1 text-[11px] relative group rounded transition-all duration-200 cursor-pointer ${
          isFavorite ? 'bg-yellow-50' : ''
        } ${
          isMeterNode && selectedMeterIds.includes(node.id) 
            ? 'bg-blue-100/70 border border-blue-400/80 shadow-sm hover:bg-blue-200/70 hover:border-blue-500' 
            : 'hover:bg-gray-100'
        }`}
        style={{
          paddingLeft: level >= 2 ? `${level * INDENT - 8}px` : `${level * INDENT + 2}px`,
          zIndex: 1,
          minHeight: `${NODE_HEIGHT}px`
        }}
        onContextMenu={isMeterNode ? (e) => { e.preventDefault(); setContextOpen(true); } : undefined}
        onMouseLeave={() => setContextOpen(false)}
        onClick={isMeterNode ? () => {
          console.log('🚀 === METER CLICKED IN SIDEBAR ===');
          console.log(`🚀 Meter clicked: ${node.id} - ${node.name}`);
          console.log(`🚀 Current selectedNodeId: ${selectedNodeId}`);
          console.log(`🚀 Setting selectedNodeId to: ${node.id}`);
          
          // เรียกใช้ setSelectedNodeId จาก MeterTreeContext
          if (setSelectedNodeId) {
            setSelectedNodeId(node.id);
            console.log(`🚀 selectedNodeId updated to: ${node.id}`);
          } else {
            console.log('❌ setSelectedNodeId is not available');
          }
          
          // อัปเดต selectedSlaveIds และ selectedMeterNames เมื่อคลิกมิเตอร์
          if (node.slave_id && setSelectedSlaveIds && setSelectedMeterNames) {
            const slaveId = parseInt(node.slave_id);
            if (!isNaN(slaveId)) {
              if (isTableDataPage) {
                // หน้า TableData: เลือกได้ทีละตัวเท่านั้น
                setSelectedSlaveIds([slaveId]);
                setSelectedMeterNames([node.name]);
                console.log(`🚀 Updated selectedSlaveIds to: [${slaveId}]`);
                console.log(`🚀 Updated selectedMeterNames to: [${node.name}]`);
              } else {
                // หน้าอื่น: เลือกได้หลายตัว
                setSelectedSlaveIds((ids: number[]) => {
                  if (ids.includes(slaveId)) {
                    // ลบออกถ้ามีอยู่แล้ว
                    const newIds = ids.filter(id => id !== slaveId);
                    const slaveIndex = ids.indexOf(slaveId);
                    setSelectedMeterNames((names: string[]) => 
                      names.filter((_, index) => index !== slaveIndex)
                    );
                    console.log(`🚀 Removed slaveId ${slaveId}, new selectedSlaveIds:`, newIds);
                    return newIds;
                  } else {
                    // เพิ่มใหม่
                    const newIds = [...ids, slaveId];
                    setSelectedMeterNames((names: string[]) => [...names, node.name]);
                    console.log(`🚀 Added slaveId ${slaveId}, new selectedSlaveIds:`, newIds);
                    return newIds;
                  }
                });
              }
            } else {
              console.log('❌ Invalid slave_id format:', node.slave_id);
            }
          } else {
            console.log('❌ No slave_id found or context functions not available');
          }
          
          if (isTableDataPage) {
            // หน้า TableData: เลือกได้ทีละตัวเท่านั้น
            if (selectedMeterIds.includes(node.id)) {
              setSelectedMeterIds([]); // ยกเลิกการเลือกทั้งหมด
            } else {
              setSelectedMeterIds([node.id]); // เลือกเฉพาะตัวนี้
            }
          } else {
            // หน้าอื่น: เลือกได้หลายตัว
            if (selectedMeterIds.includes(node.id)) {
              setSelectedMeterIds((ids: string[]) => ids.filter(id => id !== node.id));
            } else {
              setSelectedMeterIds((ids: string[]) => [...ids, node.id]);
            }
          }
          
          console.log('================================');
        } : undefined}
      >
        {/* Expand/Collapse button */}
        {hasChildren ? (
          <button
            type="button"
            className="mr-1 focus:outline-none flex items-center justify-center bg-gray-100 border border-gray-300 hover:bg-gray-200"
            style={{
              width: 14,
              height: 14,
              borderRadius: 2,
              fontSize: 9,
              fontWeight: 'bold'
            }}
            onClick={() => setIsExpanded((v) => !v)}
            tabIndex={0}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '−' : '+'}
          </button>
        ) : (
          <span style={{ width: 14, height: 14, display: 'inline-block', marginRight: 3 }} />
        )}

        {/* Icon */}
        {getIcon(node.iconType, isSystemNode)}
        <div className="flex-1 min-w-0">
          <span className={`${isSystemNode ? 'font-bold' : 'font-normal'} truncate text-[11px] ${isMeterNode && node.enabled === false ? 'text-gray-400' : 'text-foreground'}`}>
            {node.name}
          </span>
        </div>
        
        {/* Unselect button สำหรับมิเตอร์ที่เลือกแล้ว */}
        {isMeterNode && selectedMeterIds.includes(node.id) && (
          <button
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-0.5 rounded-full hover:bg-red-100 hover:text-red-600 text-gray-400"
            onClick={(e) => {
              e.stopPropagation(); // ป้องกันไม่ให้ trigger onClick ของ parent
              console.log(`🗑️ Unselecting meter: ${node.id} - ${node.name}`);
              
              // ลบออกจาก selectedMeterIds
              setSelectedMeterIds((ids: string[]) => ids.filter(id => id !== node.id));
              
              // อัปเดต selectedSlaveIds (ถ้ามี)
              if (node.slave_id && setSelectedSlaveIds) {
                const slaveId = parseInt(node.slave_id);
                if (!isNaN(slaveId)) {
                  setSelectedSlaveIds((ids: number[]) => ids.filter(id => id !== slaveId));
                  console.log(`🗑️ Removed slave_id ${slaveId} from selectedSlaveIds`);
                }
              }
            }}
            title="Remove from selection"
          >
            <XCircle className="w-3 h-3" />
          </button>
        )}
        {/* Context menu (Add/Remove Favorite) */}
        {isMeterNode && (
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <div className="absolute inset-0" />
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={() => onAddFavorite(node, isFavorite)}>
                <Star className="w-4 h-4 mr-2" />
                {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        )}
      </div>
      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child: any, index: number) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              isLast={index === node.children.length - 1}
              parentLines={[...parentLines, index < node.children.length - 1]}
              onAddFavorite={onAddFavorite}
              favoriteMeters={favoriteMeters}
              selectedMeterIds={selectedMeterIds}
              setSelectedMeterIds={setSelectedMeterIds}
              isTableDataPage={isTableDataPage}
              setSelectedSlaveIds={setSelectedSlaveIds}
              setSelectedMeterNames={setSelectedMeterNames}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Context สำหรับแชร์ selectedColumns
export const TableColumnContext = createContext<{
  selectedColumns: string[];
  setSelectedColumns: React.Dispatch<React.SetStateAction<string[]>>;
}>({
  selectedColumns: [],
  setSelectedColumns: () => {},
});

export const columnOptions = [
  "Frequency", "Volt AN", "Volt BN", "Volt CN", "Volt LN Avg", "Volt AB", "Volt BC", "Volt CA", "Volt LL Avg",
  "Current A", "Current B", "Current C", "Current Avg", "Current IN",
  "Watt A", "Watt B", "Watt C", "Watt Total",
  "Var A", "Var B", "Var C", "Var total",
  "VA A", "VA B", "VA C", "VA Total",
  "PF A", "PF B", "PF C", "PF Total",
  "Demand W", "Demand Var", "Demand VA",
  "Import kWh", "Export kWh", "Import kVarh", "Export kVarh",
  "THDV", "THDI"
];

export function SidebarMenu({ isOpen: isOpenProp, onToggle, allowedColumns, maxSelectedColumns, fixedColumns }: SidebarProps) {
  const { language } = useLanguage();
  const { onlineNodes, loading: meterTreeLoading, selectedSlaveIds, setSelectedSlaveIds, selectedMeterNames, setSelectedMeterNames } = useMeterTree();
  const [isOpen, setIsOpen] = useState(isOpenProp);
  const [selectedMeterIds, setSelectedMeterIds] = useState<string[]>([]);
  const [selectedMeterSlaveIds, setSelectedMeterSlaveIds] = useState<number[]>([]);
  const [userManuallyDeselected, setUserManuallyDeselected] = useState(false); // ติดตามว่าผู้ใช้เพิ่งกด unselect all

  const [isMobile, setIsMobile] = useState(false);



  // ตรวจสอบขนาดหน้าจอ
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
    if (onToggle) onToggle();
  };
  
  const fixed = fixedColumns ?? [];
      // ตรวจสอบว่าเป็นหน้า Charge.tsx หรือ TableData หรือ OnlineData หรือไม่
    const isChargePage = window.location.pathname === '/charge';
    const isTableDataPage = window.location.pathname === '/table-data';
    const isOnlineDataPage = window.location.pathname === '/online-data';
    const isCompareGraph = window.location.pathname.includes('/graph-data/compare');
    
    console.log('🔍 Sidebar Menu - Current page:', {
      pathname: window.location.pathname,
      isChargePage,
      isTableDataPage,
      isOnlineDataPage,
      isCompareGraph
    });
    
           // Debug สำหรับ Compare Graph
       if (isCompareGraph) {
         console.log('🎯 Compare Graph detected - Max 2 columns limit will be applied');
       }
  const columns = isChargePage ? [] : (allowedColumns || columnOptions);
  const maxColumns = maxSelectedColumns ?? undefined;
  // ใช้ context ถ้ามี
  const context = useContext(TableColumnContext);
  const selectedColumns = context.selectedColumns;
  
  // ใช้ MeterTreeContext เพื่อดูสถานะปัจจุบัน
  const { selectedNodeId, rootNodes } = useMeterTree ? useMeterTree() : { selectedNodeId: null, rootNodes: [] };
  
  // แสดงสถานะปัจจุบันของ selectedNodeId
  console.log('🚀 === SIDEBAR MENU STATUS ===');
  console.log(`🚀 Current selectedNodeId: ${selectedNodeId}`);
  console.log(`🚀 Root nodes available: ${rootNodes ? rootNodes.length : 0}`);
  console.log(`🚀 Current page: ${window.location.pathname}`);
  console.log('================================');
  const setSelectedColumns = context.setSelectedColumns;
  const [favoriteMeters, setFavoriteMeters] = useState([]);
  const [currentPage, setCurrentPage] = useState(window.location.pathname);

  // ตรวจสอบการเปลี่ยนหน้าและล้างค่า selectedColumns
  useEffect(() => {
    const newPage = window.location.pathname;
    
    if (currentPage !== newPage) {
      console.log('🔄 Page changed from', currentPage, 'to', newPage);
      console.log('🧹 Clearing selectedColumns due to page change');
      
      // ล้างค่า selectedColumns เมื่อเปลี่ยนหน้า
      setSelectedColumns([]);
      
      // รีเซ็ต userManuallyDeselected เมื่อเปลี่ยนหน้า
      setUserManuallyDeselected(false);
      
      // อัปเดต currentPage
      setCurrentPage(newPage);
      
      // ล้างการเลือกมิเตอร์เฉพาะในหน้า TableData เท่านั้น
      // สำหรับหน้าอื่นๆ ให้คงการเลือกมิเตอร์ไว้
      if (newPage.includes('/table-data') || newPage.includes('/online-data')) {
        setSelectedMeterIds([]);
        setSelectedSlaveIds([]);
        setSelectedMeterNames([]);
        console.log('✅ Cleared meter selections for TableData/OnlineData page');
      } else {
        console.log('✅ Kept meter selections for other pages');
      }
      
      console.log('✅ Cleared column selections due to page change');
    }
  }, [window.location.pathname, currentPage, setSelectedColumns, setSelectedSlaveIds, setSelectedMeterNames]);

  // Load favorite meters from localStorage
  useEffect(() => {
    try {
      const buildingFavorites = JSON.parse(localStorage.getItem('favoriteBuilding') || '[]');
      const onlineFavorites = JSON.parse(localStorage.getItem('favoriteOnline') || '[]');
      
      // รวม favorites ทั้งสองประเภท
      const allFavorites = [...buildingFavorites, ...onlineFavorites];
      setFavoriteMeters(allFavorites);
      
      console.log('✅ Loaded favorites from localStorage:', allFavorites);
    } catch (error) {
      console.error('❌ Error loading favorites from localStorage:', error);
      setFavoriteMeters([]);
    }
  }, []);

  // Debug log for sidebar
  useEffect(() => {
    console.log('🎯 SIDEBAR DEBUG:');
    console.log('   - context:', context);
    console.log('   - selectedColumns:', selectedColumns);
    console.log('   - selectedColumns length:', selectedColumns.length);
    console.log('   - selectedColumns content:', JSON.stringify(selectedColumns));
    console.log('   - columns available:', columns);
    console.log('   - pathname:', window.location.pathname);
    console.log('   - context source check:', context ? 'Context exists' : 'No context');
  }, [selectedColumns, columns, context]);

  // ฟังก์ชันสำหรับอัปเดต selectedMeterSlaveIds เมื่อมีการเลือกมิเตอร์
  const updateSelectedMeterSlaveIds = (meterIds: string[]) => {
    const slaveIds: number[] = [];
    const selectedMeterInfo: Array<{id: string, name: string, slave_id: number}> = [];
    
    // Debug: แสดงข้อมูล onlineNodes และ meterIds
    // console.log('🔍 === DEBUG METER SELECTION ===');
    // console.log('📋 Selected Meter IDs:', meterIds);
    // console.log('🌳 Online Nodes Structure:', onlineNodes);
    
    // ฟังก์ชันสำหรับค้นหา slave_id จาก node tree
    const findSlaveId = (nodes: any[]): void => {
      nodes.forEach(node => {
        // Debug: แสดงข้อมูล node แต่ละตัว
        if (node.iconType === 'meter') {
          console.log('🔍 Meter Node:', {
            id: node.id,
            name: node.name,
            slave_id: node.slave_id,
            isSelected: meterIds.includes(node.id)
          });
        }
        
        if (node.iconType === 'meter' && meterIds.includes(node.id)) {
          console.log('✅ Found selected meter:', node);
          // ดึง slave_id จาก node data หรือจาก database
          if (node.slave_id) {
            slaveIds.push(node.slave_id);
            selectedMeterInfo.push({
              id: node.id,
              name: node.name,
              slave_id: node.slave_id
            });
            console.log('✅ Added slave_id:', node.slave_id);
          } else {
            console.log('❌ No slave_id found for meter:', node.name);
          }
        }
        if (node.children && node.children.length > 0) {
          findSlaveId(node.children);
        }
      });
    };
    
    findSlaveId(onlineNodes || []);
    setSelectedMeterSlaveIds(slaveIds);
    
    // เก็บ slave_id และชื่อมิเตอร์ใน Context เพื่อใช้ใน TableData
    setSelectedSlaveIds(slaveIds);
    setSelectedMeterNames(selectedMeterInfo.map(meter => meter.name));
    
    // Log ข้อมูลการเลือกมิเตอร์ - แสดง slave_id แทน meter ID
    console.log('🎯 === METER SELECTION LOG ===');
    console.log('📋 Selected Slave IDs:', slaveIds);
    console.log('📊 Selected Meter Details:');
    selectedMeterInfo.forEach(meter => {
      console.log(`   - Name: ${meter.name}, Slave ID: ${meter.slave_id}`);
    });
    console.log('🔢 Final Slave IDs Array:', slaveIds);
    console.log('🔢 Context Slave IDs:', selectedSlaveIds);
    console.log('================================');
  };

  // อัปเดต selectedMeterSlaveIds เมื่อ selectedMeterIds เปลี่ยน
  useEffect(() => {
    updateSelectedMeterSlaveIds(selectedMeterIds);
  }, [selectedMeterIds, onlineNodes]);

  // Count total meters in tree nodes
  const countMeters = (nodes: any[]): number => {
    let count = 0;
    const countInNode = (node: any) => {
      if (node.iconType === 'meter') {
        count++;
      }
      if (node.children && node.children.length > 0) {
        node.children.forEach(countInNode);
      }
    };
    nodes.forEach(countInNode);
    return count;
  };

  const totalMeters = countMeters(onlineNodes || []);
  const shouldShowScrollbar = totalMeters > 10;

  // Favorite handlers
  const handleAddFavorite = (node: any, isFavorite: boolean) => {
    try {
      if (isFavorite) {
        // ลบออกจาก favorites
        setFavoriteMeters(favs => {
          const newFavorites = favs.filter(f => f !== node.name);
          
          // อัปเดต localStorage
          const buildingFavorites = JSON.parse(localStorage.getItem('favoriteBuilding') || '[]');
          const onlineFavorites = JSON.parse(localStorage.getItem('favoriteOnline') || '[]');
          
          // ลบออกจากทั้งสองประเภท
          const newBuildingFavorites = buildingFavorites.filter((name: string) => name !== node.name);
          const newOnlineFavorites = onlineFavorites.filter((name: string) => name !== node.name);
          
          localStorage.setItem('favoriteBuilding', JSON.stringify(newBuildingFavorites));
          localStorage.setItem('favoriteOnline', JSON.stringify(newOnlineFavorites));
          
          console.log('✅ Removed from favorites:', node.name);
          return newFavorites;
        });
      } else {
        // เพิ่มเข้า favorites
        setFavoriteMeters(favs => {
          const newFavorites = favs.includes(node.name) ? favs : [...favs, node.name];
          
          // อัปเดต localStorage - เพิ่มเข้า online favorites (เพราะ sidebar แสดง online tree)
          const onlineFavorites = JSON.parse(localStorage.getItem('favoriteOnline') || '[]');
          if (!onlineFavorites.includes(node.name)) {
            onlineFavorites.push(node.name);
            localStorage.setItem('favoriteOnline', JSON.stringify(onlineFavorites));
          }
          
          console.log('✅ Added to favorites:', node.name);
          return newFavorites;
        });
      }
    } catch (error) {
      console.error('❌ Error handling favorite:', error);
    }
  };

  const handleRemoveFavorite = (meterName: string) => {
    try {
      setFavoriteMeters(favs => {
        const newFavorites = favs.filter(f => f !== meterName);
        
        // ลบออกจาก localStorage ทั้งสองประเภท
        const buildingFavorites = JSON.parse(localStorage.getItem('favoriteBuilding') || '[]');
        const onlineFavorites = JSON.parse(localStorage.getItem('favoriteOnline') || '[]');
        
        const newBuildingFavorites = buildingFavorites.filter((name: string) => name !== meterName);
        const newOnlineFavorites = onlineFavorites.filter((name: string) => name !== meterName);
        
        localStorage.setItem('favoriteBuilding', JSON.stringify(newBuildingFavorites));
        localStorage.setItem('favoriteOnline', JSON.stringify(newOnlineFavorites));
        
        console.log('✅ Removed from favorites:', meterName);
        return newFavorites;
      });
    } catch (error) {
      console.error('❌ Error removing favorite:', error);
    }
  };

  const setAll = (checked: boolean) => {
    console.log('🚨 setAll CALLED:');
    console.log('   - checked:', checked);
    console.log('   - pathname:', window.location.pathname);
    console.trace('   - call stack:');
    
    // ตรวจสอบว่าเป็นหน้า Charge.tsx หรือไม่
    const isChargePage = window.location.pathname === '/charge';
    if (isChargePage) return; // ไม่ทำอะไรในหน้า Charge.tsx
    
    // สำหรับหน้า OnlineData ให้เลือกได้ไม่จำกัด
    const isOnlineDataPage = window.location.pathname === '/online-data';
    
    // ตรวจสอบว่าเป็นหน้า TOU-Compare หรือ CompareGraph หรือไม่
    const isTouCompare = window.location.pathname.includes('/tou-compare');
    const isCompareGraph = window.location.pathname.includes('/graph-data/compare');
    
    if (checked) {
      // สำหรับหน้า OnlineData ให้เลือกได้ไม่จำกัด
      if (isOnlineDataPage) {
        const allCols = [...fixed, ...columns.filter(c => !fixed.includes(c))];
        console.log('   - setting ALL columns for OnlineData:', allCols);
        setSelectedColumns(allCols);
      }
               // สำหรับหน้า TOU-Compare ให้เลือกได้สูงสุด 4 ค่า
         else if (isTouCompare) {
           const availableColumns = [...fixed, ...columns.filter(c => !fixed.includes(c))];
           // เลือกสูงสุด 4 ค่า
           const selected = availableColumns.slice(0, 4);
           console.log('   - setting up to 4 columns for TOU-Compare:', selected);
           setSelectedColumns(selected);
         }
         // สำหรับหน้า CompareGraph ให้เลือกได้สูงสุด 2 ค่า
         else if (isCompareGraph) {
           const availableColumns = [...fixed, ...columns.filter(c => !fixed.includes(c))];
           // เลือกสูงสุด 2 ค่า
           const selected = availableColumns.slice(0, 2);
           console.log('   - setting up to 2 columns for CompareGraph:', selected);
           setSelectedColumns(selected);
         } else {
        // สำหรับหน้าอื่นๆ รวมถึง DemandGraph เลือกทั้งหมด
        const allCols = [...fixed, ...columns.filter(c => !fixed.includes(c))];
        console.log('   - setting ALL columns:', allCols);
        setSelectedColumns(allCols);
      }
    } else {
      // Deselect all, keep only fixed columns
      console.log('   - clearing all, keeping fixed:', [...fixed]);
      setSelectedColumns([...fixed]);
    }
  };

  // Default เลือกคอลัมน์ตามหน้า (หลังจากล้างค่าแล้ว)
  useEffect(() => {
    // ตรวจสอบว่าเป็นหน้า Charge.tsx หรือไม่
    const isChargePage = window.location.pathname === '/charge';
    if (isChargePage) return; // ไม่ทำอะไรในหน้า Charge.tsx
    
    // ถ้าผู้ใช้เพิ่งกด unselect all ไม่ต้อง auto-select
    if (userManuallyDeselected) {
      console.log('🚫 User manually deselected - skipping auto-select');
      return;
    }
    
    // ตรวจสอบว่าเป็นหน้า Compare Graph หรือไม่
    const isCompareGraph = window.location.pathname.includes('/graph-data/compare');
    const isTouCompare = window.location.pathname.includes('/tou-compare');
    
    // ถ้ามี columns และยังไม่มี selectedColumns
    if (columns.length > 0 && selectedColumns.length === 0) {
      // ใช้ setTimeout เพื่อให้แน่ใจว่าการล้างค่าเสร็จแล้ว
      setTimeout(() => {
        if (isCompareGraph) {
          // สำหรับหน้า Compare Graph ให้ default เลือก 2 ค่าแรก
          const defaultColumns = [...fixed, ...columns.filter(c => !fixed.includes(c))].slice(0, 2);
          console.log('✅ Default selecting 2 columns for Compare Graph:', defaultColumns);
          setSelectedColumns(defaultColumns);
        } else if (isTouCompare) {
          // สำหรับหน้า TOU-Compare ให้ default เลือก 4 ค่าแรก
          const defaultColumns = [...fixed, ...columns.filter(c => !fixed.includes(c))].slice(0, 4);
          console.log('✅ Default selecting 4 columns for TOU-Compare:', defaultColumns);
          setSelectedColumns(defaultColumns);
        } else {
          // สำหรับหน้าอื่นๆ ให้เลือกทั้งหมด
          const allColumns = [...fixed, ...columns.filter(c => !fixed.includes(c))];
          console.log('✅ Default selecting all columns for other pages:', allColumns);
          setSelectedColumns(allColumns);
        }
      }, 100); // รอ 100ms เพื่อให้การล้างค่าเสร็จสิ้น
    }
  }, [columns, selectedColumns.length, fixed, setSelectedColumns, userManuallyDeselected]);

  const toggleColumn = (col: string) => {
    console.log('🔄 SIDEBAR TOGGLE CLICK:');
    console.log('   - column:', col);
    console.log('   - current selectedColumns:', selectedColumns);
    
    // ตรวจสอบว่าเป็นหน้า Charge.tsx หรือไม่
    const isChargePage = window.location.pathname === '/charge';
    if (isChargePage) return; // ไม่ทำอะไรในหน้า Charge.tsx
    
    // สำหรับหน้า OnlineData ให้เลือกได้ไม่จำกัด
    const isOnlineDataPage = window.location.pathname === '/online-data';
    
    if (fixed.includes(col)) return; // ห้าม toggle
    
    // ลบการบังคับคอลัมน์ในหน้า Line Graph - ให้ผู้ใช้เลือกได้เต็มที่
    // const isLineGraphPage = window.location.pathname.includes('/graph-data/line');
    // const mandatoryColumns = ['Import_kWh', 'Export_kWh', 'Import_kVarh', 'Export_kVarh'];
    // if (isLineGraphPage && mandatoryColumns.includes(col) && selectedColumns.includes(col)) {
    //   return; // ห้ามติ้กออกจากคอลัมน์บังคับในหน้า Line Graph
    // }
    
    // ตรวจสอบว่าเป็นหน้า TOU-Compare หรือ CompareGraph หรือไม่
    const isTouCompare = window.location.pathname.includes('/tou-compare');
    const isCompareGraph = window.location.pathname.includes('/graph-data/compare');
    
    setSelectedColumns(selectedColumns => {
      console.log('🔄 setSelectedColumns called with current:', selectedColumns);
      
      if (selectedColumns.includes(col)) {
        const newColumns = selectedColumns.filter(c => c !== col);
        console.log('   - removing column, new array:', newColumns);
        return newColumns;
      } else {
        // สำหรับหน้า OnlineData ให้เลือกได้ไม่จำกัด
        if (isOnlineDataPage) {
          const newColumns = [...selectedColumns, col];
          console.log('   - adding column for OnlineData (unlimited), new array:', newColumns);
          return newColumns;
        }
                 // สำหรับหน้า TOU-Compare ให้เลือกได้สูงสุด 4 ค่า
         else if (isTouCompare) {
           if (selectedColumns.length >= 4) {
             console.log('   - max 4 columns reached for TOU-Compare');
             return selectedColumns; // ไม่เพิ่มถ้าเกิน 4 ค่า
           }
           const newColumns = [...selectedColumns, col];
           console.log('   - adding column for TOU-Compare (max 4), new array:', newColumns);
           return newColumns;
         }
         // สำหรับหน้า CompareGraph ให้เลือกได้สูงสุด 2 ค่า
         else if (isCompareGraph) {
           if (selectedColumns.length >= 2) {
             console.log('   - max 2 columns reached for CompareGraph');
             return selectedColumns; // ไม่เพิ่มถ้าเกิน 2 ค่า
           }
           const newColumns = [...selectedColumns, col];
           console.log('   - adding column for CompareGraph (max 2), new array:', newColumns);
           return newColumns;
         } else {
          // สำหรับหน้าอื่นๆ รวมถึง DemandGraph ใช้ logic เดิม
          if (maxColumns && selectedColumns.length >= maxColumns + fixed.length) {
            console.log('   - max columns reached');
            return selectedColumns; // ไม่เพิ่มถ้าเกิน max
          }
          const newColumns = [...selectedColumns, col];
          console.log('   - adding column, new array:', newColumns);
          return newColumns;
        }
      }
    });
  };

  return (
    <>
      {/* Mobile/Tablet Overlay */}
      {isOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-white/20 backdrop-blur-sm z-40"
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "bg-background border-r border-border transition-all duration-300 shadow-lg flex flex-col",
        // Mobile: fixed position, full height
        isMobile ? "fixed left-0 top-0 h-screen z-50" : "relative h-screen",
        // Width responsive
        isOpen 
          ? isMobile 
            ? "w-60 sm:w-64" // Mobile: narrower width
            : "w-40 lg:w-48 xl:w-56" // Desktop: narrower responsive width
          : isMobile
            ? "w-0 overflow-hidden" // Mobile: completely hidden when closed
            : "w-7" // Desktop: collapsed state
      )}>
        {/* Toggle button - responsive positioning */}
        <button
          onClick={handleToggle}
          className={cn(
            "flex items-center justify-center bg-white rounded-md shadow border border-gray-200 focus:outline-none hover:bg-gray-100 transition-all duration-200",
            isMobile 
              ? isOpen 
                ? "absolute right-4 top-4 w-8 h-8 z-20" // Mobile: close button in corner when open
                : "fixed left-4 top-4 w-10 h-10 z-50" // Mobile: menu button when closed
              : "absolute left-full top-1/2 -translate-y-1/2 ml-[-6px] w-6 h-12 z-20" // Desktop: side toggle
          )}
          aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
          style={{ padding: 0 }}
        >
          {isMobile ? (
            isOpen ? (
              <X className="w-4 h-4 text-black" />
            ) : (
              <Menu className="w-5 h-5 text-black" />
            )
          ) : (
            <svg
              className={cn("w-3 h-3 text-black transition-transform duration-200", isOpen ? "rotate-180" : "")}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
            </svg>
          )}
        </button>

        {isOpen ? (
          <ScrollArea className="flex-1 min-h-0">
            <div className={cn(
              "space-y-2",
              isMobile ? "pt-16 px-4 pb-4" : "pt-2 px-2" // Mobile: more padding for touch
            )}>
              {/* Meter Tree */}
              <Card>
                <CardContent className={cn(
                  isMobile ? "p-4" : "p-3 pt-4" // Mobile: more padding
                )}>
                  <h3 className={cn(
                    "font-semibold mb-2 flex items-center",
                    isMobile ? "text-base" : "text-sm"
                  )}>
                    <BuildingOfficeIcon className={cn(
                      "mr-2",
                      isMobile ? "w-5 h-5" : "w-4 h-4"
                    )} style={{ color: '#1A357D' }} />
                    {language === 'TH' ? 'โครงสร้างมิเตอร์' : 'Meter Tree'}
                  </h3>
                  <div className={cn(
                    "space-y-1",
                    shouldShowScrollbar && "overflow-y-auto",
                    shouldShowScrollbar && (isMobile ? "max-h-80" : "max-h-64")
                  )}>
                    {meterTreeLoading ? (
                      <div className={cn(
                        "text-gray-400",
                        isMobile ? "text-sm" : "text-xs"
                      )}>{language === 'TH' ? 'กำลังโหลด...' : 'Loading...'}</div>
                    ) : onlineNodes && onlineNodes.length > 0 ? (
                      <>
                        {shouldShowScrollbar && (
                          <div className={cn(
                            "text-xs text-gray-500 mb-2 pb-1 border-b border-gray-200",
                            isMobile ? "text-sm" : "text-xs"
                          )}>
                            {language === 'TH' ? `มิเตอร์ทั้งหมด: ${totalMeters} ตัว` : `Total meters: ${totalMeters}`}
                          </div>
                        )}
                        {onlineNodes.map((node) => (
                          <TreeNode 
                            key={node.id} 
                            node={node} 
                            onAddFavorite={handleAddFavorite} 
                            favoriteMeters={favoriteMeters} 
                            selectedMeterIds={selectedMeterIds} 
                            setSelectedMeterIds={setSelectedMeterIds} 
                            isTableDataPage={isTableDataPage}
                            setSelectedSlaveIds={setSelectedSlaveIds}
                            setSelectedMeterNames={setSelectedMeterNames}
                          />
                        ))}
                      </>
                    ) : (
                      <div className={cn(
                        "text-gray-400",
                        isMobile ? "text-sm" : "text-xs"
                      )}>{language === 'TH' ? 'ไม่มีข้อมูลโครงสร้างมิเตอร์' : 'No meter tree data'}</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Favorites */}
              <Card>
                <CardContent className={cn(
                  isMobile ? "p-4" : "p-3"
                )}>
                  <h3 className={cn(
                    "font-semibold mb-2 flex items-center",
                    isMobile ? "text-base" : "text-sm"
                  )}>
                    <Star className={cn(
                      "mr-2",
                      isMobile ? "w-5 h-5" : "w-4 h-4"
                    )} />
                    {language === 'TH' ? 'มิเตอร์ที่ชื่นชอบ' : 'Favorites Meter'}
                  </h3>
                  <div className="space-y-1">
                    {favoriteMeters.map((meter, index) => (
                      <div key={index} className={cn(
                        "flex items-center justify-between bg-yellow-50 rounded px-2",
                        isMobile ? "py-2" : "py-1"
                      )}>
                        <span className={cn(
                          "flex items-center",
                          isMobile ? "text-sm" : "text-xs"
                        )}>
                          <Star className="w-3 h-3 text-yellow-400 mr-1" />
                          {meter}
                        </span>
                        <button
                          type="button"
                          className={cn(
                            "ml-2 text-gray-400 hover:text-red-500",
                            isMobile && "p-1" // Mobile: larger touch target
                          )}
                          onClick={() => handleRemoveFavorite(meter)}
                          aria-label="Remove from favorites"
                        >
                          <Star className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Table Columns - แสดงเฉพาะเมื่อมี allowedColumns และไม่ใช่หน้า Charge.tsx */}
              {columns.length > 0 && !isChargePage && (
                <Card>
                  <CardContent className={cn(
                    isMobile ? "p-4" : "p-3"
                  )}>
                    <div className={cn(
                      "overflow-y-auto grid grid-cols-1 gap-1 pr-1",
                      isMobile ? "max-h-80 gap-2" : "max-h-64"
                    )}>
                      {/* ปุ่ม All สำหรับทุกหน้า */}
                      {(() => {
                        const isTouCompare = window.location.pathname.includes('/tou-compare');
                        const isCompareGraph = window.location.pathname.includes('/graph-data/compare');
                        const isOnlineDataPage = window.location.pathname === '/online-data';
                        const isLineGraphPage = window.location.pathname.includes('/graph-data/line');
                        
                        // สำหรับหน้า TOU-Compare (สูงสุด 4 คอลัมน์)
                        if (isTouCompare) {
                          const maxColumns = 4;
                          const availableColumns = [...fixed, ...columns.filter(c => !fixed.includes(c))];
                          const maxSelectableColumns = Math.min(maxColumns, availableColumns.length);
                          const isAllSelected = selectedColumns.length >= maxSelectableColumns && 
                                               availableColumns.slice(0, maxSelectableColumns).every(col => selectedColumns.includes(col));
                          
                          return (
                            <label className={cn(
                              "flex items-center gap-2 cursor-pointer select-none font-medium",
                              isMobile ? "text-sm py-1" : "text-xs"
                            )}>
                              <input
                                type="checkbox"
                                checked={isAllSelected}
                                onChange={() => {
                                  console.log('🔄 TOU-Compare All button clicked:', {
                                    isAllSelected,
                                    maxSelectableColumns,
                                    selectedColumns,
                                    availableColumns: availableColumns.slice(0, maxSelectableColumns)
                                  });
                                  
                                  if (isAllSelected) {
                                    setSelectedColumns([...fixed]); // เก็บเฉพาะ fixed columns
                                    setUserManuallyDeselected(true); // ผู้ใช้กด unselect all
                                  } else {
                                    const selectedCols = availableColumns.slice(0, maxColumns);
                                    setSelectedColumns(selectedCols);
                                    setUserManuallyDeselected(false); // ผู้ใช้กด select all
                                  }
                                }}
                                className={cn(
                                  "accent-primary",
                                  isMobile && "w-4 h-4"
                                )}
                              />
                              {isAllSelected 
                                ? (language === 'TH' ? 'ยกเลิกทั้งหมด' : 'Unselect All')
                                : (language === 'TH' ? 'เลือกทั้งหมด' : 'All')
                              }
                            </label>
                          );
                        }
                        // สำหรับหน้า Compare Graph (สูงสุด 2 คอลัมน์)
                        else if (isCompareGraph) {
                          const maxColumns = 2;
                          const availableColumns = [...fixed, ...columns.filter(c => !fixed.includes(c))];
                          const maxSelectableColumns = Math.min(maxColumns, availableColumns.length);
                          const isAllSelected = selectedColumns.length >= maxSelectableColumns && 
                                               availableColumns.slice(0, maxSelectableColumns).every(col => selectedColumns.includes(col));
                          
                          return (
                            <label className={cn(
                              "flex items-center gap-2 cursor-pointer select-none font-medium",
                              isMobile ? "text-sm py-1" : "text-xs"
                            )}>
                              <input
                                type="checkbox"
                                checked={isAllSelected}
                                onChange={() => {
                                  console.log('🔄 Compare Graph All button clicked:', {
                                    isAllSelected,
                                    maxSelectableColumns,
                                    selectedColumns,
                                    availableColumns: availableColumns.slice(0, maxSelectableColumns)
                                  });
                                  
                                  if (isAllSelected) {
                                    setSelectedColumns([...fixed]); // เก็บเฉพาะ fixed columns
                                    setUserManuallyDeselected(true); // ผู้ใช้กด unselect all
                                  } else {
                                    const selectedCols = availableColumns.slice(0, maxColumns);
                                    setSelectedColumns(selectedCols);
                                    setUserManuallyDeselected(false); // ผู้ใช้กด select all
                                  }
                                }}
                                className={cn(
                                  "accent-primary",
                                  isMobile && "w-4 h-4"
                                )}
                              />
                              {isAllSelected 
                                ? (language === 'TH' ? 'ยกเลิกทั้งหมด' : 'Unselect All')
                                : (language === 'TH' ? 'เลือกทั้งหมด' : 'All')
                              }
                            </label>
                          );
                        }
                        // สำหรับหน้าอื่นๆ รวมถึง LineGraph, OnlineData (ไม่จำกัดจำนวน)
                        else {
                          const availableColumns = [...fixed, ...columns.filter(c => !fixed.includes(c))];
                          const isAllSelected = availableColumns.length > 0 && availableColumns.every(col => selectedColumns.includes(col));
                          
                          return (
                            <label className={cn(
                              "flex items-center gap-2 cursor-pointer select-none font-medium",
                              isMobile ? "text-sm py-1" : "text-xs"
                            )}>
                              <input
                                type="checkbox"
                                checked={isAllSelected}
                                onChange={() => {
                                  console.log('🔄 All button clicked:', {
                                    isAllSelected,
                                    availableColumns,
                                    selectedColumns,
                                    fixed
                                  });
                                  
                                  if (isAllSelected) {
                                    // ยกเลิกทั้งหมด
                                    setSelectedColumns([...fixed]);
                                    setUserManuallyDeselected(true); // ผู้ใช้กด unselect all
                                    console.log('   → Deselecting all, keeping fixed:', [...fixed]);
                                  } else {
                                    // เลือกทั้งหมด
                                    setSelectedColumns(availableColumns);
                                    setUserManuallyDeselected(false); // ผู้ใช้กด select all
                                    console.log('   → Selecting all:', availableColumns);
                                  }
                                }}
                                className={cn(
                                  "accent-primary",
                                  isMobile && "w-4 h-4"
                                )}
                              />
                              {isAllSelected 
                                ? (language === 'TH' ? 'ยกเลิกทั้งหมด' : 'Unselect All')
                                : (language === 'TH' ? 'เลือกทั้งหมด' : 'All')
                              }
                            </label>
                          );
                        }
                      })()}
                      {[...fixed, ...columns.filter(c => !fixed.includes(c))].map((col) => (
                        <label key={col} className={cn(
                          "flex items-center gap-2 cursor-pointer select-none",
                          isMobile ? "text-sm py-1" : "text-xs"
                        )}>
                          <input
                            type="checkbox"
                            checked={selectedColumns.includes(col)}
                            onChange={() => toggleColumn(col)}
                            className={cn(
                              "accent-primary",
                              isMobile && "w-4 h-4"
                            )}
                            disabled={fixed.includes(col)}
                          />
                          {col}
                        </label>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        ) : !isMobile ? ( // Only show collapsed indicators on desktop
          <div className="p-2 space-y-2">
            <div className="w-2 h-2 bg-green-500 rounded-full mx-auto" />
            <div className="w-2 h-2 bg-yellow-500 rounded-full mx-auto" />
            <div className="w-2 h-2 bg-red-500 rounded-full mx-auto" />
          </div>
        ) : null}
      </div>
    </>
  );
}