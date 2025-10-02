import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import OnlineData from "./pages/OnlineData";
import TableData from "./pages/TableData";
import GraphData from "./pages/GraphData";
import Config from "./pages/Config";
import Users from "./pages/Users";
import Export from "./pages/Export";
import NotFound from "./pages/NotFound";
import LineGraph from "./pages/LineGraph";
import DemandGraph from "./pages/DemandGraph";
import TOUDemand from "./pages/TOU-Demand";
import EnergyGraph from "./pages/EnergyGraph";
import CompareGraph from "./pages/CompareGraph";
import Event from "./pages/Event";
import MeterTree from "./pages/MeterTree";
import Email from "./pages/Email";
import HubDashboard from "./pages/HubDashboard";
import { Home } from "./components/dashboard/HubDashboard";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import { MeterTreeProvider } from './context/MeterTreeContext';
import { EmailDataProvider } from './context/EmailDataContext';
import { TableColumnContext } from './components/ui/sidebar-menu';
import TOUEnergy from "./pages/TOU-Energy";
import TOUCompare from "./pages/TOU-Compare";
import Charge from "./pages/Charge";
import Holiday from "./pages/Holiday";
import { GuestRestrictedRoute, AuthRequiredRoute } from './components/auth/ProtectedRoute';
import { PermissionsProvider } from './hooks/usePermissions';
import { RBACRoute, AdminRoute } from './components/auth/RBACRoute';

import React, { useState } from 'react';
import { LanguageProvider } from './context/LanguageContext';

const queryClient = new QueryClient();

const App = () => {
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    "Frequency", "Volt AN", "Volt BN", "Volt CN", "Volt LN Avg", "Volt AB", "Volt BC", "Volt CA", "Volt LL Avg",
    "Current A", "Current B", "Current C", "Current Avg", "Current IN",
    "Watt A", "Watt B", "Watt C", "Watt Total",
    "Var A", "Var B", "Var C", "Var total",
    "VA A", "VA B", "VA C", "VA Total",
    "PF A", "PF B", "PF C", "PF Total",
    "Demand W", "Demand Var", "Demand VA",
    "Import kWh", "Export kWh", "Import kVarh", "Export kVarh",
    "THDV", "THDI"
  ]);

  return (
    <LanguageProvider>
      <PermissionsProvider>
        <MeterTreeProvider>
          <EmailDataProvider>
            <TableColumnContext.Provider value={{ selectedColumns, setSelectedColumns }}>
            <QueryClientProvider client={queryClient}>
              <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Navigate to="/login" replace />} />
                  
                  {/* Public Routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  
                  {/* Routes with RBAC Protection */}
                  <Route path="/home" element={<AuthRequiredRoute><Home /></AuthRequiredRoute>} />
                  <Route path="/dashboard" element={<AuthRequiredRoute><RBACRoute module="Dashboard"><HubDashboard /></RBACRoute></AuthRequiredRoute>} />
                  
                  {/* Table Data - Test role should have access */}
                  <Route path="/table-data" element={<AuthRequiredRoute><RBACRoute module="Table Data"><TableData /></RBACRoute></AuthRequiredRoute>} />
                  
                  {/* Graph Data - Test role should have access */}
                  <Route path="/graph-data" element={<AuthRequiredRoute><RBACRoute module="Graph Data"><GraphData /></RBACRoute></AuthRequiredRoute>} />
                  <Route path="/graph-data/line" element={<AuthRequiredRoute><RBACRoute module="Line Graph"><LineGraph /></RBACRoute></AuthRequiredRoute>} />
                  <Route path="/graph-data/demand" element={<AuthRequiredRoute><RBACRoute module="Demand Graph"><DemandGraph /></RBACRoute></AuthRequiredRoute>} />
                  <Route path="/graph-data/energy" element={<AuthRequiredRoute><RBACRoute module="Energy Graph"><EnergyGraph /></RBACRoute></AuthRequiredRoute>} />
                  <Route path="/graph-data/compare" element={<AuthRequiredRoute><RBACRoute module="Compare Graph"><CompareGraph /></RBACRoute></AuthRequiredRoute>} />
                  
                  {/* Other Routes - Admin or specific permissions required */}
                  <Route path="/online-data" element={<AuthRequiredRoute><RBACRoute module="Online Data"><OnlineData /></RBACRoute></AuthRequiredRoute>} />
                  <Route path="/event" element={<AuthRequiredRoute><RBACRoute module="Event"><Event /></RBACRoute></AuthRequiredRoute>} />
                  <Route path="/tou-demand" element={<AuthRequiredRoute><RBACRoute module="TOU Demand Graph"><TOUDemand /></RBACRoute></AuthRequiredRoute>} />
                  <Route path="/tou-energy" element={<AuthRequiredRoute><RBACRoute module="TOU Energy Graph"><TOUEnergy /></RBACRoute></AuthRequiredRoute>} />
                  <Route path="/tou-compare" element={<AuthRequiredRoute><RBACRoute module="TOU Compare Graph"><TOUCompare /></RBACRoute></AuthRequiredRoute>} />
                  <Route path="/charge" element={<AuthRequiredRoute><RBACRoute module="Charge"><Charge /></RBACRoute></AuthRequiredRoute>} />
                  <Route path="/config" element={<AuthRequiredRoute><RBACRoute module="Config"><Config /></RBACRoute></AuthRequiredRoute>} />
                  <Route path="/export" element={<AuthRequiredRoute><RBACRoute module="Export Data"><Export /></RBACRoute></AuthRequiredRoute>} />
                  <Route path="/email" element={<AuthRequiredRoute><RBACRoute module="Email Line"><Email /></RBACRoute></AuthRequiredRoute>} />
                  <Route path="/config/email" element={<AuthRequiredRoute><RBACRoute module="Email Line"><Email /></RBACRoute></AuthRequiredRoute>} />
                  <Route path="/meter-tree" element={<AuthRequiredRoute><RBACRoute module="Meter Tree"><MeterTree /></RBACRoute></AuthRequiredRoute>} />
                  <Route path="/holiday" element={<AuthRequiredRoute><RBACRoute module="Holiday"><Holiday /></RBACRoute></AuthRequiredRoute>} />
                  
                  {/* User Management route */}
                  <Route path="/users" element={<AuthRequiredRoute><RBACRoute module="User Management"><Users /></RBACRoute></AuthRequiredRoute>} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
              </TooltipProvider>
            </QueryClientProvider>
            </TableColumnContext.Provider>
          </EmailDataProvider>
        </MeterTreeProvider>
      </PermissionsProvider>
    </LanguageProvider>
  );
};

export default App;
