import React from 'react';
import { Lock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface GuestRestrictedFeatureProps {
  children: React.ReactNode;
  featureName?: string;
  showAlert?: boolean;
  fallbackComponent?: React.ReactNode;
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

// Default fallback component for restricted features
const RestrictedFeatureFallback: React.FC<{ featureName: string }> = ({ featureName }) => (
  <Alert className="border-orange-200 bg-orange-50">
    <Lock className="h-4 w-4 text-orange-600" />
    <AlertDescription className="text-orange-800">
      <div className="flex items-center justify-between">
        <div>
          <strong>Feature Restricted</strong>
          <p className="text-sm mt-1">
            {featureName} is not available for Guest accounts. Please login with a full user account.
          </p>
        </div>
        <AlertTriangle className="h-5 w-5 text-orange-500 ml-4 flex-shrink-0" />
      </div>
    </AlertDescription>
  </Alert>
);

// Disabled button component for restricted actions
export const GuestRestrictedButton: React.FC<{
  children: React.ReactNode;
  featureName?: string;
  className?: string;
  variant?: any;
  size?: any;
  [key: string]: any;
}> = ({ 
  children, 
  featureName = "This feature", 
  className = "", 
  variant = "outline",
  size,
  ...props 
}) => {
  const isGuest = isGuestUser();
  
  if (isGuest) {
    return (
      <Button
        {...props}
        variant={variant}
        size={size}
        disabled={true}
        className={`${className} opacity-50 cursor-not-allowed`}
        title={`${featureName} is not available for Guest accounts`}
      >
        <Lock className="w-4 h-4 mr-2" />
        {children}
      </Button>
    );
  }
  
  return (
    <Button {...props} variant={variant} size={size} className={className}>
      {children}
    </Button>
  );
};

// Main component for feature-level restrictions
export const GuestRestrictedFeature: React.FC<GuestRestrictedFeatureProps> = ({
  children,
  featureName = "This feature",
  showAlert = true,
  fallbackComponent
}) => {
  const isGuest = isGuestUser();

  if (isGuest) {
    if (fallbackComponent) {
      return <>{fallbackComponent}</>;
    }
    
    if (showAlert) {
      return <RestrictedFeatureFallback featureName={featureName} />;
    }
    
    // Return null to hide the feature completely
    return null;
  }

  return <>{children}</>;
};

// Hook for checking guest status
export const useGuestStatus = () => {
  const isGuest = isGuestUser();
  
  return {
    isGuest,
    canAccess: (feature: string) => {
      if (isGuest) {
        console.log(`🔒 Guest user cannot access: ${feature}`);
        return false;
      }
      return true;
    }
  };
};

export default GuestRestrictedFeature;
