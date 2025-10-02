import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { NavLink, useNavigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  Database, 
  BarChart3, 
  Settings, 
  Users, 
  Download,
  Globe,
  Activity,
  Clock,
  FileText,
  Bell,
  Mail,
  MessageSquare,
  User,
  GitBranch,
  ChevronDown,
  TrendingUp,
  Zap,
  BarChart,
  DollarSign,
  LogOut,
  UserPlus,
  Menu,
  X,
  Table,
  ChartNoAxesCombined,
  LayoutDashboard,
  ChartPie,
  FolderTree,
  Calendar as CalendarIcon,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { TbWavesElectricity, TbSolarElectricity, TbFileExport, TbUserShare } from 'react-icons/tb';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<any>;
  description?: string;
  children?: { title: string; href: string; icon?: React.ComponentType<any> }[];
}

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  language: 'TH' | 'EN';
  username?: string;
}

function LogoutConfirmModal({ isOpen, onClose, onConfirm, language, username }: LogoutConfirmModalProps) {
  if (!isOpen) return null;

  const title = language === 'TH' ? 'คุณกำลังออกจากระบบ' : 'Logout...';
  const message = language === 'TH' 
    ?  'คุณต้องการออกจากระบบหรือไม่?' 
    : 'Are you sure you want to Logout?';
  const userMessage = username && language === 'TH' 
    ? `คุณกำลังจะออกจากระบบในชื่อ "${username}"` 
    : username && language === 'EN' 
    ? `You are about to logout from "${username}"` 
    : '';
  const confirmText = language === 'TH' ? 'ออกจากระบบ' : 'Logout';
  const cancelText = language === 'TH' ? 'ยกเลิก' : 'Cancel';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300 scale-100">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1 rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-red-100 rounded-full flex items-center justify-center mx-auto">
              <TbUserShare className="w-8 h-8 text-orange-600" />
            </div>
            
            <div className="space-y-2">
              <p className="text-gray-700 text-base font-medium">{message}</p>
              {userMessage && (
                <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3 border border-gray-200">
                  {userMessage}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl">
          <Button
            variant="outline"
            onClick={onClose}
            className="px-6 py-2 text-gray-600 border-gray-300 hover:bg-gray-100 hover:border-gray-400 transition-all duration-200"
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            className="px-6 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ฟังก์ชันสำหรับกรองเมนูตาม permissions
function getNavItems(language: string, isGuest: boolean, hasPermission: (module: string, action: string) => boolean, isAdmin: boolean): NavItem[] {
  // Guest จะใช้ permissions เหมือนกับ user ปกติ แต่จะมีข้อจำกัดตาม permissions ที่กำหนด
  console.log('🔍 Navigation - isGuest:', isGuest, 'isAdmin:', isAdmin);
  
  if (isAdmin) {
    console.log('✅ Admin user - showing all menus');
    return getAllNavItems(language as 'TH' | 'EN');
  }

  // สร้างเมนูตาม permissions
  const menuItems: NavItem[] = [];
  
  // Test some permissions
  console.log('🔍 Dashboard permission:', hasPermission('Dashboard', 'read'));
  console.log('🔍 Table Data permission:', hasPermission('Table Data', 'read'));
  console.log('🔍 Online Data permission:', hasPermission('Online Data', 'read'));
  console.log('🔍 Event permission:', hasPermission('Event', 'read'));
  console.log('🔍 TOU permission:', hasPermission('TOU', 'read'));
  console.log('🔍 Config permission:', hasPermission('Config', 'read'));

  // Home - ทุกคนเข้าถึงได้
  menuItems.push({
    title: language === 'TH' ? 'หน้าแรก' : 'Home',
    href: '/home',
    icon: Home,
    description: language === 'TH' ? 'หน้าแรก' : 'Home Page'
  });

  // Dashboard - ตรวจสอบสิทธิ์
  if (hasPermission('Dashboard', 'read')) {
    menuItems.push({
      title: language === 'TH' ? 'แดชบอร์ด' : 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      description: language === 'TH' ? 'แดชบอร์ดรวม' : 'Dashboard Overview'
    });
  }

  // Table Data - ตรวจสอบสิทธิ์
  if (hasPermission('Table Data', 'read')) {
    menuItems.push({
      title: language === 'TH' ? 'ข้อมูลย้อนหลัง' : 'Table Data',
      href: '/table-data',
      icon: Table,
      description: language === 'TH' ? 'ตารางข้อมูลย้อนหลัง' : 'Historical Table Data'
    });
  }

  // Online Data - ตรวจสอบสิทธิ์
  if (hasPermission('Online Data', 'read')) {
    menuItems.push({
      title: language === 'TH' ? 'ข้อมูลเรียลไทม์' : 'Online Data',
      href: '/online-data',
      icon: Activity,
      description: language === 'TH' ? 'ข้อมูลมิเตอร์แบบเรียลไทม์' : 'Real-time Meter Data'
    });
  }

  // Graph Data - ตรวจสอบสิทธิ์
  if (hasPermission('Graph Data', 'read')) {
    const graphChildren = [];
    
    if (hasPermission('Line Graph', 'read')) {
      graphChildren.push({ title: language === 'TH' ? 'กราฟเส้น' : 'Line Graph', href: '/graph-data/line', icon: ChartNoAxesCombined });
    }
    if (hasPermission('Demand Graph', 'read')) {
      graphChildren.push({ title: language === 'TH' ? 'กราฟดีมานด์' : 'Demand Graph', href: '/graph-data/demand', icon: Activity });
    }
    if (hasPermission('Energy Graph', 'read')) {
      graphChildren.push({ title: language === 'TH' ? 'กราฟพลังงาน' : 'Energy Graph', href: '/graph-data/energy', icon: TbWavesElectricity });
    }
    if (hasPermission('Compare Graph', 'read')) {
      graphChildren.push({ title: language === 'TH' ? 'กราฟเปรียบเทียบ' : 'Compare Graph', href: '/graph-data/compare', icon: GitBranch });
    }

    if (graphChildren.length > 0) {
      menuItems.push({
        title: language === 'TH' ? 'กราฟข้อมูล' : 'Graph Data',
        href: '/graph-data',
        icon: BarChart3,
        description: language === 'TH' ? 'กราฟแสดงข้อมูล' : 'Data Graphs',
        children: graphChildren,
      });
    }
  }

   // TOU - ตรวจสอบสิทธิ์
   if (hasPermission('TOU', 'read')) {
    const touChildren = [];
    
    if (hasPermission('TOU Demand Graph', 'read')) {
      touChildren.push({ title: language === 'TH' ? 'กราฟดีมานด์' : 'Demand Graph', href: '/tou-demand', icon: TrendingUp });
    }
    if (hasPermission('TOU Energy Graph', 'read')) {
      touChildren.push({ title: language === 'TH' ? 'กราฟพลังงาน' : 'Energy Graph', href: '/tou-energy', icon: TbSolarElectricity });
    }
    if (hasPermission('TOU Compare Graph', 'read')) {
      touChildren.push({ title: language === 'TH' ? 'กราฟเปรียบเทียบ' : 'Compare Graph', href: '/tou-compare', icon: ChartPie });
    }
    if (hasPermission('Charge', 'read')) {
      touChildren.push({ title: language === 'TH' ? 'คำนวณค่าไฟ' : 'Charge', href: '/charge', icon: DollarSign });
    }

    if (touChildren.length > 0) {
      menuItems.push({
        title: language === 'TH' ? 'TOU' : 'TOU',
        href: '/tou',
        icon: Clock,
        description: language === 'TH' ? 'การใช้ไฟตามช่วงเวลา' : 'Time of Use',
        children: touChildren,
      });
    }
  }

  // Event - ตรวจสอบสิทธิ์
  if (hasPermission('Event', 'read')) {
    menuItems.push({
      title: language === 'TH' ? 'เหตุการณ์' : 'Event',
      href: '/event',
      icon: Bell,
      description: language === 'TH' ? 'เหตุการณ์ที่เกิดขึ้น' : 'Events'
    });
  }

 

  // Config - ตรวจสอบสิทธิ์
  if (hasPermission('Config', 'read')) {
    const configChildren = [];
    
    if (hasPermission('Export Data', 'read')) {
      configChildren.push({ title: language === 'TH' ? 'ส่งออกข้อมูล' : 'Export Data', href: '/export', icon: TbFileExport });
    }
    if (hasPermission('Email Line', 'read')) {
      configChildren.push({ title: language === 'TH' ? 'อีเมล/ไลน์' : 'Email , Line', href: '/config/email', icon: Mail });
    }
    if (hasPermission('User Management', 'read')) {
      configChildren.push({ title: language === 'TH' ? 'จัดการผู้ใช้' : 'User Management', href: '/users', icon: User });
    }
    if (hasPermission('Meter Tree', 'read')) {
      configChildren.push({ title: language === 'TH' ? 'โครงสร้างมิเตอร์' : 'Meter Tree', href: '/meter-tree', icon: FolderTree });
    }
    if (hasPermission('Holiday', 'read')) {
      configChildren.push({ title: language === 'TH' ? 'วันหยุดและ FT' : 'Holiday & FT', href: '/holiday', icon: CalendarIcon });
    }

    if (configChildren.length > 0) {
      menuItems.push({
        title: language === 'TH' ? 'ตั้งค่า' : 'Config',
        href: '/config',
        icon: Settings,
        description: language === 'TH' ? 'การตั้งค่าระบบ' : 'System Settings',
        children: configChildren,
      });
    }
  }

  console.log('📋 Final menu items:', menuItems.length);
  console.log('🎯 Menu titles:', menuItems.map(item => item.title));
  
  return menuItems;
}

// ฟังก์ชันสำหรับ Admin ที่มีสิทธิ์ทุกอย่าง
function getAllNavItems(language: 'TH' | 'EN'): NavItem[] {
  return [
    {
      title: language === 'TH' ? 'หน้าแรก' : 'Home',
      href: '/home',
      icon: Home,
      description: language === 'TH' ? 'หน้าแรก' : 'Home Page'
    },
    {
      title: language === 'TH' ? 'แดชบอร์ด' : 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      description: language === 'TH' ? 'แดชบอร์ดรวม' : 'Dashboard Overview'
    },
    {
      title: language === 'TH' ? 'ข้อมูลย้อนหลัง' : 'Table Data',
      href: '/table-data',
      icon: Table,
      description: language === 'TH' ? 'ตารางข้อมูลย้อนหลัง' : 'Historical Table Data'
    },
    {
      title: language === 'TH' ? 'ข้อมูลเรียลไทม์' : 'Online Data',
      href: '/online-data',
      icon: Activity,
      description: language === 'TH' ? 'ข้อมูลมิเตอร์แบบเรียลไทม์' : 'Real-time Meter Data'
    },
    {
      title: language === 'TH' ? 'กราฟข้อมูล' : 'Graph Data',
      href: '/graph-data',
      icon: BarChart3,
      description: language === 'TH' ? 'กราฟแสดงข้อมูล' : 'Data Graphs',
      children: [
        { title: language === 'TH' ? 'กราฟเส้น' : 'Line Graph', href: '/graph-data/line', icon: ChartNoAxesCombined },
        { title: language === 'TH' ? 'กราฟดีมานด์' : 'Demand Graph', href: '/graph-data/demand', icon: Activity },
        { title: language === 'TH' ? 'กราฟพลังงาน' : 'Energy Graph', href: '/graph-data/energy', icon: TbWavesElectricity },
        { title: language === 'TH' ? 'กราฟเปรียบเทียบ' : 'Compare Graph', href: '/graph-data/compare', icon: GitBranch },
      ],
    },
    {
      title: language === 'TH' ? 'TOU' : 'TOU',
      href: '/tou',
      icon: Clock,
      description: language === 'TH' ? 'การใช้ไฟตามช่วงเวลา' : 'Time of Use',
      children: [
        { title: language === 'TH' ? 'กราฟดีมานด์' : 'Demand Graph', href: '/tou-demand', icon: TrendingUp },
        { title: language === 'TH' ? 'กราฟพลังงาน' : 'Energy Graph', href: '/tou-energy', icon: TbSolarElectricity },
        { title: language === 'TH' ? 'กราฟเปรียบเทียบ' : 'Compare Graph', href: '/tou-compare', icon: ChartPie },
        { title: language === 'TH' ? 'คำนวณค่าไฟ' : 'Charge', href: '/charge', icon: DollarSign },
      ],
    },
    {
      title: language === 'TH' ? 'เหตุการณ์' : 'Event',
      href: '/event',
      icon: Bell,
      description: language === 'TH' ? 'เหตุการณ์ที่เกิดขึ้น' : 'Events'
    },
    {
      title: language === 'TH' ? 'ตั้งค่า' : 'Config',
      href: '/config',
      icon: Settings,
      description: language === 'TH' ? 'การตั้งค่าระบบ' : 'System Settings',
      children: [
        { title: language === 'TH' ? 'ส่งออกข้อมูล' : 'Export Data', href: '/export', icon: TbFileExport },
        { title: language === 'TH' ? 'อีเมล/ไลน์' : 'Email , Line', href: '/config/email', icon: Mail },
        { title: language === 'TH' ? 'จัดการผู้ใช้' : 'User Management', href: '/users', icon: User },
        { title: language === 'TH' ? 'โครงสร้างมิเตอร์' : 'Meter Tree', href: '/meter-tree', icon: FolderTree },
        { title: language === 'TH' ? 'วันหยุดและ FT' : 'Holiday & FT', href: '/holiday', icon: CalendarIcon },
      ],
    },
  ];
}

export function MainNavigation() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);
  const { language, setLanguage } = useLanguage();
  const { user, isAdmin, loading, hasPermission } = usePermissions();

  // ใช้ข้อมูลจาก usePermissions แทน localStorage
  const username = user?.username || localStorage.getItem('userUsername') || '';
  const userRole = user?.role || 'Guest';
  const isGuest = userRole.toLowerCase() === 'guest';
  const userLevel = isAdmin ? 'Admin' : (isGuest ? 'Guest' : userRole);
  
  console.log('🧭 Navigation Debug:', {
    username,
    userRole,
    userLevel,
    isAdmin,
    isGuest,
    loading,
    user
  });
  
  const navItems = getNavItems(language, isGuest, hasPermission, isAdmin);

  const handleLanguageSwitch = () => {
    setLanguage(language === 'TH' ? 'EN' : 'TH');
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = () => {
    // Clear session data but preserve Remember Me if it exists
    const rememberMe = localStorage.getItem('rememberMe');
    const savedUsername = localStorage.getItem('savedUsername');
    const savedPassword = localStorage.getItem('savedPassword');
    
    // Clear ALL user session data
    localStorage.removeItem('userEmail');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('authToken'); // เพิ่มการลบ authToken
    localStorage.removeItem('userUsername');
    localStorage.removeItem('userRole'); // เพิ่มการลบ userRole
    localStorage.removeItem('userLevel'); // เพิ่มการลบ userLevel
    localStorage.removeItem('isGuest');
    localStorage.removeItem('googleUser'); // เพิ่มการลบ googleUser
    
    // Clear LINE login data
    localStorage.removeItem('lineUser');
    localStorage.removeItem('line_login_state');
    localStorage.removeItem('line_access_token');
    
    // Clear any other session data
    localStorage.removeItem('currentUser');
    localStorage.removeItem('sessionData');
    
    // Keep Remember Me data if it exists
    if (rememberMe === 'true' && savedUsername && savedPassword) {
      console.log('🔒 Preserving Remember Me credentials for next login');
      // Keep the remember me data intact
    } else {
      // Clear remember me if it wasn't set
      localStorage.removeItem('rememberMe');
      localStorage.removeItem('savedUsername');
      localStorage.removeItem('savedPassword');
    }
    
    // Force reload permissions context
    window.dispatchEvent(new Event('userDataUpdated'));
    
    // Navigate to login page
    navigate('/login');
    
    // Close modal
    setShowLogoutModal(false);
    
    // Force page reload to ensure complete cleanup (optional but safer)
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <>
      <div className="flex items-center justify-between w-full px-2 sm:px-4 py-0 bg-primary text-black h-12">
        {/* Logo Section */}
        <div className="flex items-center">
          <img src="/Amptron.png" alt="WebMeter Logo" className="w-12 h-6 sm:w-16 sm:h-8 md:w-20 md:h-9" />
          <div className="flex flex-col justify-center -ml-1 sm:-ml-3">
            <h1 className="text-xs sm:text-sm font-bold tracking-wide text-white">WEBMETER</h1>
            <p className="text-[8px] sm:text-[10px] opacity-90 text-white hidden sm:block">Track your Energy , Anywhere Anytime</p>
          </div>
        </div>

        {/* Desktop Navigation Menu */}
        <nav className="hidden lg:flex items-center space-x-1 xl:space-x-2 h-full">
          {navItems.map((item) => (
            <div key={item.href} className="relative h-full group/dropdown">
              {item.children ? (
                <div className="relative h-full">
                  <div
                    className={cn(
                      "px-1 xl:px-2 py-1 h-full rounded-none flex items-center space-x-1 xl:space-x-2 text-xs xl:text-sm font-medium transition-colors duration-200 cursor-pointer",
                      "text-white hover:bg-white/80 hover:text-primary",
                      "group-hover/dropdown:bg-white/80 group-hover/dropdown:text-primary"
                    )}
                    style={{height: '100%'}}
                  >
                    <item.icon className="w-4 h-4 text-white hover:text-primary group-hover/dropdown:text-primary transition-colors duration-200" />
                    <span className="whitespace-nowrap">{item.title}</span>
                    <ChevronDown className="w-2.5 h-2.5 text-white hover:text-primary group-hover/dropdown:text-primary transition-all duration-200 hover:rotate-180 group-hover/dropdown:rotate-180" />
                  </div>
                  
                  {/* Dropdown Menu - แสดงเมื่อ hover */}
                  <div className="absolute top-full left-0 min-w-[200px] bg-white border border-gray-200 shadow-lg rounded-none p-2 z-50 mt-1 opacity-0 invisible group-hover/dropdown:opacity-100 group-hover/dropdown:visible transition-all duration-200"
                       onMouseEnter={() => {}} onMouseLeave={() => {}}>
                    <div className="flex flex-col space-y-1">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.href}
                          to={child.href}
                          className={({ isActive }) =>
                            cn(
                              "px-3 py-2 rounded-none text-sm text-primary hover:bg-primary/10 hover:text-primary active:text-primary active:bg-primary/20 transition-colors duration-200 flex items-center space-x-2 whitespace-nowrap",
                              isActive ? "bg-primary/10 text-primary font-medium" : ""
                            )
                          }
                        >
                          {child.icon && <child.icon className="w-4 h-4 flex-shrink-0 text-primary" />}
                          <span>{child.title}</span>
                        </NavLink>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <NavLink
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      "group px-1 xl:px-2 h-full flex items-center space-x-1 xl:space-x-2 text-xs xl:text-sm font-medium text-white relative transition-all duration-200 whitespace-nowrap",
                      isActive
                        ? "bg-white text-primary font-semibold h-full shadow-none"
                        : "hover:bg-white/80 hover:text-primary active:text-primary h-full"
                    )
                  }
                  style={{height: '100%'}}
                >
                  {({ isActive }) => (
                    <>
                      <item.icon className={cn(
                        "w-4 h-4 transition-colors duration-200",
                        isActive ? "text-primary" : "text-white group-hover:text-primary group-active:text-primary"
                      )} />
                      <span>{item.title}</span>
                    </>
                  )}
                </NavLink>
              )}
            </div>
          ))}
        </nav>

        {/* Mobile Menu Button */}
        <button 
          onClick={toggleMobileMenu}
          className="lg:hidden text-white p-2 hover:bg-white/20 rounded transition-colors duration-200"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                  </button>

          {/* Right Section - Language & User Controls */}
          <div className="hidden lg:flex items-center rounded-none space-x-3">
          {/* Show user info - username and role */}
          {username && (
            <div className="flex flex-col items-end text-white">
              <span className="text-xs xl:text-sm font-medium">{username}</span>
              <span className="text-[10px] xl:text-xs opacity-80">{userLevel}</span>
            </div>
          )}
          
          <div className="flex items-center space-x-0">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-white bg-transparent px-3 py-1 transition-all duration-200 hover:bg-white/10 rounded-none"
              onClick={handleLanguageSwitch}
            >
              <img 
                src={language === 'TH' ? 'https://flagcdn.com/w20/th.png' : 'https://flagcdn.com/w20/gb.png'} 
                alt={language === 'TH' ? 'Thai Flag' : 'UK Flag'}
                className="w-3 h-3 xl:w-5 xl:h-4 rounded-sm"
              />
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon"
              className="relative text-white bg-transparent w-8 h-8 xl:w-10 xl:h-10  rounded-none flex items-center justify-center p-0 hover:bg-white/10 transition-all duration-200 border-none group"
              onClick={handleLogoutClick}
              aria-label="Logout"
            >
              <TbUserShare className="w-8 h-8 xl:w-10 xl:h-10 text-white font-bold" />
              {/* Tooltip */}
              <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-0.5  bg-gray-800 text-white text-[10px] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50 rounded-none">
              Logout
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-white/20 backdrop-blur-sm z-40" onClick={toggleMobileMenu}>
          <div className="absolute top-12 left-0 right-0 bg-white shadow-lg border-t border-gray-200 max-h-[calc(100vh-3rem)] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 space-y-3">
              {/* Mobile Language & Logout Controls */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-primary bg-transparent px-3 py-2 rounded-full transition-all duration-200 hover:bg-primary/10"
                  onClick={handleLanguageSwitch}
                >
                  <img 
                    src={language === 'TH' ? 'https://flagcdn.com/w20/th.png' : 'https://flagcdn.com/w20/gb.png'} 
                    alt={language === 'TH' ? 'Thai Flag' : 'UK Flag'}
                    className="w-6 h-4 rounded-sm mr-2"
                  />
                  <span className="text-sm">{language}</span>
                </Button>
                {username && (
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-medium text-primary">{username}</span>
                    <span className="text-xs opacity-80 text-primary">{userLevel}</span>
                  </div>
                )}
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-primary bg-transparent px-3 py-2 rounded-full hover:bg-primary/10 transition-all duration-200"
                  onClick={() => {
                    handleLogoutClick();
                    setMobileMenuOpen(false);
                  }}
                >
                  <TbUserShare className="w-5 h-5 mr-2 font-bold" />
                  <span className="text-sm">Logout</span>
                </Button>
              </div>

              {/* Mobile Navigation Items */}
              {navItems.map((item) => (
                <div key={item.href} className="space-y-2">
                  {item.children ? (
                    <>
                      <div className="flex items-center space-x-3 px-3 py-3 text-primary font-medium border-b border-gray-100">
                        <item.icon className="w-5 h-5 text-primary" />
                        <span className="text-base">{item.title}</span>
                      </div>
                      <div className="pl-6 space-y-1">
                        {item.children.map((child) => (
                          <NavLink
                            key={child.href}
                            to={child.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={({ isActive }) =>
                              cn(
                                "flex items-center space-x-3 px-3 py-2 rounded-md text-sm transition-colors duration-200",
                                isActive 
                                  ? "bg-primary/10 text-primary font-medium" 
                                  : "text-gray-600 hover:bg-primary/5 hover:text-primary"
                              )
                            }
                          >
                            {child.icon && <child.icon className="w-4 h-4 flex-shrink-0" />}
                            <span>{child.title}</span>
                          </NavLink>
                        ))}
                      </div>
                    </>
                  ) : (
                    <NavLink
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center space-x-3 px-3 py-3 rounded-md text-base transition-colors duration-200",
                          isActive 
                            ? "bg-primary/10 text-primary font-medium" 
                            : "text-gray-700 hover:bg-primary/5 hover:text-primary"
                        )
                      }
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      <span>{item.title}</span>
                    </NavLink>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={handleLogoutCancel}
        onConfirm={handleLogoutConfirm}
        language={language}
        username={username}
      />
    </>
  );
}