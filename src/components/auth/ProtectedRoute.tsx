import React from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Lock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  allowGuest?: boolean;
  fallbackPath?: string;
}

// Helper function to check if user is guest
const isGuestUser = (): boolean => {
  const token = localStorage.getItem('auth_token');
  let levelFromToken = '';
  
  try {
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1] || ''));
      if (payload?.level) levelFromToken = payload.level;
    }
  } catch {}
  
  return (levelFromToken || '').toLowerCase() === 'guest' || localStorage.getItem('isGuest') === 'true';
};

// Helper function to check if user is authenticated
const isAuthenticated = (): boolean => {
  const username = localStorage.getItem('userUsername');
  const authToken = localStorage.getItem('auth_token');
  const isGuest = localStorage.getItem('isGuest') === 'true';
  
  // Check if user has valid username or auth token
  const hasValidUsername = username && username !== 'null' && username !== 'undefined';
  const hasValidToken = authToken && authToken !== 'null' && authToken !== 'undefined';
  
  console.log('🔍 Authentication Check:', {
    hasValidUsername,
    hasValidToken,
    isGuest,
    username: username?.substring(0, 10) + '...'
  });
  
  return hasValidUsername || hasValidToken || isGuest;
};

// Access Denied Component
const AccessDenied: React.FC<{ reason: string; onGoBack: () => void }> = ({ reason, onGoBack }) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
    <Card className="w-full max-w-md shadow-xl border-red-200">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-red-600" />
        </div>
        <CardTitle className="text-xl font-bold text-red-800 flex items-center justify-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Access Denied
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 font-medium mb-2">🚫 Access Restricted</p>
          <p className="text-sm text-red-600">{reason}</p>
        </div>
        
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-center gap-2 mb-2">
            <User className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Guest Account Limitations</span>
          </div>
          <p className="text-xs text-blue-600">
            Guest users have read-only access to basic features only.
            Contact administrator for full access.
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-4">
          <Button 
            onClick={onGoBack}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            ← Go Back to Home
          </Button>
          <Button 
            variant="outline"
            onClick={() => window.location.href = '/login'}
            className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Login with Full Account
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  allowGuest = true,
  fallbackPath = '/login'
}) => {
  const authenticated = isAuthenticated();
  const isGuest = isGuestUser();

  // Check if authentication is required
  if (requireAuth && !authenticated) {
    return <Navigate to={fallbackPath} replace />;
  }

  // Check if guest access is allowed
  if (authenticated && isGuest && !allowGuest) {
    const handleGoBack = () => {
      window.history.back();
      // Fallback if history is empty
      setTimeout(() => {
        if (window.location.pathname === window.location.pathname) {
          window.location.href = '/home';
        }
      }, 100);
    };

    return (
      <AccessDenied 
        reason="This feature is not available for Guest accounts. Please login with a full user account to access this functionality."
        onGoBack={handleGoBack}
      />
    );
  }

  return <>{children}</>;
};

// Specific route guards
export const GuestRestrictedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute requireAuth={true} allowGuest={false}>
    {children}
  </ProtectedRoute>
);

export const AuthRequiredRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute requireAuth={true} allowGuest={true}>
    {children}
  </ProtectedRoute>
);

export default ProtectedRoute;
