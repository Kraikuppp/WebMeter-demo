import React, { useState, createContext, useContext, useEffect } from 'react';
import { MainNavigation } from '@/components/ui/navigation';
import { SidebarMenu, columnOptions, TableColumnContext } from '@/components/ui/sidebar-menu';
import { useLocation } from 'react-router-dom';

interface PageLayoutProps {
  children: React.ReactNode;
}

// Context สำหรับแชร์ sidebar state
export const SidebarStateContext = createContext<{
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}>({
  sidebarOpen: true,
  setSidebarOpen: () => {},
});

export function PageLayout({ children }: PageLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation().pathname;
  
  // Debug: แสดงข้อมูล location
  console.log('🔍 PageLayout Debug:', {
    location,
    isLineGraph: location.includes('/graph-data/line'),
    isLinePage: location === '/graph-data/line'
  });
  // เฉพาะหน้า DemandGraph
  const isDemandGraph = location.includes('/graph-data/demand');
  const demandColumns = ['Demand W', 'Demand Var', 'Demand VA'];
  const isEnergyGraph = location.includes('/graph-data/energy');
  const energyColumns = ['Import kWh', 'Export kWh', 'Import kVarh', 'Export kVarh'];
  const isLineGraph = location.includes('/graph-data/line');
  const isCompareGraph = location.includes('/graph-data/compare');
  // เฉพาะหน้า TOU-Demand
  const isTouDemandGraph = location.includes('/tou-demand');
  const touDemandColumns = ['Demand W', 'Demand Var', 'Demand VA'];
  // เฉพาะหน้า TOU-Energy
  const isTouEnergyGraph = location.includes('/tou-energy');
  const touEnergyColumns = ['Import kWh', 'Import kVarh'];
  // เฉพาะหน้า TOU-Compare
  const isTouCompareGraph = location.includes('/tou-compare');
  const touCompareColumns = ['Demand W', 'Demand Var', 'Demand VA','Import kWh', 'Export kWh', 'Import kVarh', 'Export kVarh'];
  const isMeterTree = location === '/meter-tree';
  const isEventPage = location === '/event';
  const isExportPage = location === '/export';
  const isUsersPage = location === '/users';
  const isEmailPage = location === '/email';
  const isLinePage = location === '/graph-data/line';
  const isOnlineDataPage = location === '/online-data';
  const isConfigEmailPage = location === '/config/email';
  const isConfigLinePage = location === '/config/line';
  const isDashboardPage = location === '/dashboard';
  const isHomePage = location === '/home';
  const isChargePage = location === '/charge';
  const isHolidayPage = location === '/holiday';


  return (
    <SidebarStateContext.Provider value={{ sidebarOpen, setSidebarOpen }}>
      <div className="min-h-screen bg-background">
        <MainNavigation />
        <div className="flex">
        {(() => {
          const shouldShowSidebar = !isMeterTree && !isEventPage && !isExportPage && !isUsersPage && !isEmailPage && !isConfigEmailPage && !isConfigLinePage && !isDashboardPage && !isHomePage && !isHolidayPage && !isChargePage;
          
          console.log('🔍 Sidebar Debug:', {
            shouldShowSidebar,
            isMeterTree,
            isEventPage,
            isExportPage,
            isUsersPage,
            isEmailPage,
            isConfigEmailPage,
            isConfigLinePage,
            isDashboardPage,
            isHomePage,
            isHolidayPage,
            isChargePage
          });
          
          return shouldShowSidebar;
        })() && (
          <SidebarMenu
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            allowedColumns={
              isCompareGraph ? touCompareColumns :
              isDemandGraph ? demandColumns :
              isEnergyGraph ? energyColumns :
              isLineGraph ? undefined :
              isTouDemandGraph ? touDemandColumns :
              isTouEnergyGraph ? touEnergyColumns :
              isTouCompareGraph ? touCompareColumns :
              isChargePage ? [] :

              undefined
            }
            maxSelectedColumns={
              isDemandGraph || isTouDemandGraph ? 3 :
              isTouCompareGraph || isCompareGraph ? 2 :

              undefined
            }
            fixedColumns={undefined}
          />
        )}
        <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-0' : 'lg:ml-0'}`}>
          {children}
        </main>
      </div>
        </div>
    </SidebarStateContext.Provider>
  );
}