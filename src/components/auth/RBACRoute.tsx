// RBAC Protected Route Component
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermissions, ProtectedComponent } from '../../hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home } from 'lucide-react';

interface RBACRouteProps {
  children: React.ReactNode;
  module: string;
  action?: 'read' | 'write' | 'report';
  fallback?: React.ReactNode;
}

// Component สำหรับป้องกัน route ด้วย RBAC
export function RBACRoute({ children, module, action = 'read', fallback }: RBACRouteProps) {
  const { loading, error } = usePermissions();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading permissions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Permission Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const defaultFallback = (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="text-red-500 text-6xl mb-6">🚫</div>
        <h2 className="text-2xl font-semibold text-gray-800 mb-3">Access Denied</h2>
        <p className="text-gray-600 mb-2">You don't have permission to access this page.</p>
        <p className="text-sm text-gray-500 mb-6">Required: {action} access to {module}</p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button 
            onClick={() => navigate(-1)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Button>
          
          <Button 
            onClick={() => navigate('/home')}
            className="flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            Go to Home
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <ProtectedComponent 
      module={module} 
      action={action} 
      fallback={fallback || defaultFallback}
    >
      {children}
    </ProtectedComponent>
  );
}

// Admin-only route
export function AdminRoute({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const { isAdmin, loading, error } = usePermissions();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading permissions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Permission Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-red-500 text-6xl mb-6">👑</div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-3">Admin Access Required</h2>
          <p className="text-gray-600 mb-6">This page is restricted to administrators only.</p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              onClick={() => navigate(-1)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </Button>
            
            <Button 
              onClick={() => navigate('/home')}
              className="flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              Go to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default RBACRoute;
