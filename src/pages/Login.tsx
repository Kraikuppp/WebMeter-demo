import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Zap, Sparkles, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp';
import api from '@/services/api';
import { logLogin, logSecurityEvent, EventSeverity } from '@/hooks/useEventLogger';

// Google OAuth types
interface GoogleCredentialResponse {
  credential: string;
  select_by: string;
}

interface GoogleUserInfo {
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  email: string;
  email_verified: boolean;
}

// Declare global google object
declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: () => void;
          renderButton: (element: HTMLElement, config: any) => void;
        };
      };
    };
  }
}

const Login = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [registerData, setRegisterData] = useState({
    username: '',
    email: '',
    password: '',
    name: '',
    surname: '',
    address: '',
    phone: '',
    lineId: '',
    confirmPassword: ''
  });
  const [validationErrors, setValidationErrors] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    lineId: ''
  });
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState(3);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Product slides data
  const productSlides = [
    {
      id: 1,
      title: "AcuCT Split Core Current Transformer",
      description: "The AcuCT 5A Series is a robust, compact 1A or 5A split-core current transformer designed for high-precision industrial applications",
      image: "/acuCT_Split_Core.png",
      features: [
        "Revenue grade accuracy: IEC 61869-2 Class 0.5s",
        "Current input range: 5A - 5000A AC ",
        "Choose from 1A or 5A industrial standard output",
        "Split core design for quick installation"
      ],
      hasShopButton: true
    },
    {
      id: 2,
      title: "Acuvim 3 ADVANCED POWER QUALITY METER",
      description: "The Acuvim 3 Series is an advanced high-precision power quality analyzer and revenue grade power meter",
      image: "/acuvim_3.png",
      features: [
        "IEC 62053-22 Class 0.1S & ANSI C12.20 Class 0.1 accuracy for revenue metering",
        "Disturbance direction detection determines upstream or downstream PQ disturbances by voltages and currents",
        "Enhanced ITIC curve with colour-coded zones and real-time mapping of sag/swell data points",
        "Meter sampling rate at 1024 samples per cycle"
      ],
      hasShopButton: true
    },
    {
      id: 3,
      title: "Acuvim L Series Power Meter",
      description: "The Acuvim L is a cost-effective, multifunction power and energy meter that offers value and high-performance for a wide range of standard metering projects.",
      image: "/acuvim_L.png",
      features: [
        "EL Revenue Grade: ANSIC12.20 class 0.2 & IEC62053-22 class 0.2s",
        "Designed with industry -leading cybersecurity",
        "CL Revenue Grade: ANSI C12.20 class 0.5 & IEC62053-22 class 0.5s",
        "4th CT input – Measure neutral current"
      ],
      hasShopButton: true
    },
    {
      id: 4,
      title: "AcuCT S220 Series",
      description: "High precision solid-core current transformer for permanent installations. The AcuCT S220 features multiple input and output options in a small compact form factor",
      image: "/s200.png",
      features: [
        "Accuracy class: 0.5, 0.5S, 0.2",
        "Current input options: 200A, 250A,300A, 500A, 600A, 800A, 1000A, 1200A,1500A",
        "Choose from five output options:5A, 1A, 100mA, 80mA, 333mV",
        "Window Size Ø 57.0 mm (2.24”)"
      ],
      hasShopButton: true
    },
    {
      id: 5,
      title: "Acuvim II Revenue Grade Meter",
      description: "The Acuvim II Series power and energy meters are the simple, robust solution for power monitoring, kWh metering, power quality analysis, and more.",
      image: "/acuvim_ii.png",
      features: [
        "Revenue Grade: ANSI C12.20 class 0.1 & IEC 62053-22 class 0.1s",
        "4th CT input to measure neutral current",
        "IEC 61000-4-30 Class S compliant power quality event measurements for Acuvim IIW",
        "Dual Ethernet ports with both RSTP bridge daisychain mode and separately configurable network"
      ],
      hasShopButton: true
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % productSlides.length);
    }, 5000); // Change slide every 5 seconds
    return () => clearInterval(interval);
  }, [productSlides.length]);

  // Load saved credentials on component mount
  useEffect(() => {
    const savedRememberMe = localStorage.getItem('rememberMe');
    const savedUsername = localStorage.getItem('savedUsername');
    const savedPassword = localStorage.getItem('savedPassword');
    
    if (savedRememberMe === 'true' && savedUsername && savedPassword) {
      setUsername(savedUsername);
      setPassword(savedPassword);
      setRememberMe(true);
      console.log('🔄 Loaded saved credentials for:', savedUsername);
    }
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % productSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + productSlides.length) % productSlides.length);
  };

  // Load Google Identity Services
  useEffect(() => {
    const loadGoogleScript = () => {
      if (document.getElementById('google-identity-script')) {
        initializeGoogleAuth();
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-identity-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogleAuth;
      document.head.appendChild(script);
    };

    const initializeGoogleAuth = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com',
          callback: handleGoogleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });
      }
    };

    loadGoogleScript();
  }, []);

  // Lockout countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLocked && lockoutTime > 0) {
      timer = setInterval(() => {
        setLockoutTime((prev) => {
          if (prev <= 1) {
            setIsLocked(false);
            setError('');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isLocked, lockoutTime]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLocked) {
      return;
    }

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log('🔍 === FRONTEND LOGIN ATTEMPT ===');
      console.log('📝 Attempting login for username:', username);
      
      const response = await api.login(username, password);
      
      console.log('🔍 === SERVER RESPONSE ===');
      console.log('📝 Response success:', response.success);
      console.log('📝 Response data:', response.data);
      console.log('📝 User object:', response.data?.user);
      
      if (response.success && response.data) {
        // Clear any existing session data first
        const rememberMeData = {
          rememberMe: localStorage.getItem('rememberMe'),
          savedUsername: localStorage.getItem('savedUsername'),
          savedPassword: localStorage.getItem('savedPassword')
        };
        
        // Clear specific session data instead of all localStorage
        const keysToRemove = ['userUsername', 'userRole', 'userLevel', 'isGuest', 'authToken', 'googleUser'];
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Login successful - use username and role from server response
        const actualUsername = response.data.user?.username || username;
        const userRole = response.data.user?.role || response.data.user?.level || 'Guest';
        const userLevel = response.data.user?.level || 'Guest';
        
        console.log('🔍 === FRONTEND ROLE ASSIGNMENT ===');
        console.log('📝 Server response user object:', response.data.user);
        console.log('📝 response.data.user?.role:', response.data.user?.role);
        console.log('📝 response.data.user?.level:', response.data.user?.level);
        console.log('📝 Calculated userRole:', userRole);
        console.log('📝 Calculated userLevel:', userLevel);
        
        localStorage.setItem('userUsername', actualUsername);
        localStorage.setItem('userRole', userRole);
        localStorage.setItem('userLevel', userLevel);
        localStorage.setItem('isGuest', 'false');
        localStorage.setItem('authToken', response.data.token); // เพิ่ม authToken
        
        // Dispatch custom event to notify other components
        window.dispatchEvent(new Event('userDataUpdated'));
        
        // Force refresh permissions hook immediately
        setTimeout(() => {
          window.dispatchEvent(new Event('userDataUpdated'));
        }, 100);
        
        console.log('💾 === STORED IN LOCALSTORAGE ===');
        console.log('📝 userUsername:', localStorage.getItem('userUsername'));
        console.log('📝 userRole:', localStorage.getItem('userRole'));
        console.log('📝 userLevel:', localStorage.getItem('userLevel'));
        console.log('📝 authToken:', localStorage.getItem('authToken') ? 'exists' : 'missing');
        console.log('📝 isGuest:', localStorage.getItem('isGuest'));
        
        // Debug: แสดงข้อมูลทั้งหมดใน localStorage
        console.log('🗂️ All localStorage keys:', Object.keys(localStorage));
        console.log('🗂️ All localStorage data:', {
          userUsername: localStorage.getItem('userUsername'),
          userRole: localStorage.getItem('userRole'),
          userLevel: localStorage.getItem('userLevel'),
          authToken: localStorage.getItem('authToken') ? '[TOKEN_EXISTS]' : null,
          isGuest: localStorage.getItem('isGuest'),
          rememberMe: localStorage.getItem('rememberMe'),
          savedUsername: localStorage.getItem('savedUsername')
        });
        console.log('- Stored role:', userRole);
        console.log('- Stored level:', userLevel);
        
        // Log successful login with actual username
        await logLogin(actualUsername, true);
        
        // Handle Remember Me functionality
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
          localStorage.setItem('savedUsername', actualUsername); // Use actual username from server
          localStorage.setItem('savedPassword', password);
          console.log('💾 Credentials saved for Remember Me with actual username:', actualUsername);
        } else {
          // Don't save remember me data
          console.log('🗑️ Remember Me not selected - credentials not saved');
        }
        
        // Reset error states
        setError('');
        setRemainingAttempts(3);
        setIsLocked(false);
        
        navigate('/home');
      } else {
        // Login failed - handle different error scenarios
        if (response.error) {
          setError(response.error);
          
          // Log failed login attempt
          await logLogin(username, false);
          
          // Handle lockout scenario
          if (response.lockoutTime) {
            setIsLocked(true);
            setLockoutTime(response.lockoutTime);
            
            // Log security event for account lockout
            await logSecurityEvent(`Account locked: ${username}`, EventSeverity.HIGH);
          }
          
          // Handle remaining attempts
          if (response.remainingAttempts !== undefined) {
            setRemainingAttempts(response.remainingAttempts);
            
            // Log security event for multiple failed attempts
            if (response.remainingAttempts <= 1) {
              await logSecurityEvent(`Multiple failed login attempts: ${username}`, EventSeverity.MEDIUM);
            }
          }
        } else {
          setError('Login failed. Please check your credentials.');
          await logLogin(username, false);
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setError('Network error. Please check your connection and try again.');
      
      // Log system error
      await logSecurityEvent(`Login system error: ${error.message}`, EventSeverity.HIGH);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    // Clear any existing user session data
    localStorage.clear();
    
    // Set guest login data
    localStorage.setItem('isGuest', 'true');
    localStorage.setItem('userUsername', 'guest');
    localStorage.setItem('userRole', 'Guest');
    
    console.log('👤 Guest login - cleared all previous session data');
    console.log('👤 Guest permissions will be loaded by usePermissions hook');
    
    // Log guest login
    await logLogin('guest', true);
    
    // Trigger permissions reload
    window.dispatchEvent(new Event('userDataUpdated'));
    
    navigate('/home');
  };

  // Handle Google credential response
  const handleGoogleCredentialResponse = async (response: GoogleCredentialResponse) => {
    setGoogleLoading(true);
    setError('');

    try {
      console.log('🔍 Google Login Debug:');
      console.log('- Credential received:', response.credential ? 'Yes' : 'No');
      
      // Decode the JWT token to get user info
      const base64Url = response.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      
      const googleUserInfo: GoogleUserInfo = JSON.parse(jsonPayload);
      console.log('- User info decoded:', {
        email: googleUserInfo.email,
        name: googleUserInfo.name,
        verified: googleUserInfo.email_verified
      });

      // Check if user exists in our system
      try {
        const loginResponse = await api.googleLogin({
          googleId: googleUserInfo.sub,
          email: googleUserInfo.email,
          name: googleUserInfo.given_name || googleUserInfo.name,
          surname: googleUserInfo.family_name || '',
          picture: googleUserInfo.picture,
          credential: response.credential
        });

        if (loginResponse.success && loginResponse.data) {
          // Clear any existing session data first
          localStorage.clear();
          
          // User exists and login successful - use username and role from server response
          const actualUsername = loginResponse.data.user?.username || googleUserInfo.email;
          const userRole = loginResponse.data.user?.role || loginResponse.data.user?.level || 'Guest';
          const userLevel = loginResponse.data.user?.level || 'Guest';
          
          localStorage.setItem('userUsername', actualUsername);
          localStorage.setItem('userRole', userRole);
          localStorage.setItem('userLevel', userLevel);
          localStorage.setItem('isGuest', 'false');
          localStorage.setItem('googleUser', 'true');
          localStorage.setItem('authToken', loginResponse.data.token); // เพิ่ม authToken
          
          // Dispatch custom event to notify other components
          window.dispatchEvent(new Event('userDataUpdated'));
          
          console.log('✅ Google login successful:');
          console.log('- Google email:', googleUserInfo.email);
          console.log('- Server username:', loginResponse.data.user?.username);
          console.log('- Server role:', loginResponse.data.user?.role);
          console.log('- Server level:', loginResponse.data.user?.level);
          console.log('- Stored username:', actualUsername);
          console.log('- Stored role:', userRole);
          console.log('- Stored level:', userLevel);
          
          // Clear remember me for Google login (different auth method)
          localStorage.removeItem('rememberMe');
          localStorage.removeItem('savedUsername');
          localStorage.removeItem('savedPassword');
          
          // Log successful Google login with actual username
          await logLogin(actualUsername, true);
          
          navigate('/home');
        } else {
          // User doesn't exist, show registration form with pre-filled data
          console.log('📝 User not found, showing registration form');
          setRegisterData(prev => ({
            ...prev,
            email: googleUserInfo.email,
            name: googleUserInfo.given_name || googleUserInfo.name.split(' ')[0] || '',
            surname: googleUserInfo.family_name || googleUserInfo.name.split(' ').slice(1).join(' ') || '',
            username: googleUserInfo.email.split('@')[0] // Suggest username from email
          }));
          setShowRegister(true);
        }
      } catch (apiError: any) {
        console.error('API Error:', apiError);
        
        // If API call fails, assume user doesn't exist and show registration
        console.log('📝 API error, showing registration form');
        setRegisterData(prev => ({
          ...prev,
          email: googleUserInfo.email,
          name: googleUserInfo.given_name || googleUserInfo.name.split(' ')[0] || '',
          surname: googleUserInfo.family_name || googleUserInfo.name.split(' ').slice(1).join(' ') || '',
          username: googleUserInfo.email.split('@')[0]
        }));
        setShowRegister(true);
      }
    } catch (error: any) {
      console.error('Google login error:', error);
      setError('Google login failed. Please try again.');
      
      // Log security event for Google login failure
      await logSecurityEvent(`Google login error: ${error.message}`, EventSeverity.MEDIUM);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    if (!window.google) {
      setError('Google services not loaded. Please refresh the page and try again.');
      return;
    }

    setGoogleLoading(true);
    setError('');

    try {
      // Trigger Google One Tap or popup
      window.google.accounts.id.prompt();
    } catch (error: any) {
      console.error('Google signup error:', error);
      setError('Failed to initialize Google login. Please try again.');
      setGoogleLoading(false);
    }
  };

  const handleLineLogin = async () => {
    try {
      // Line Login Configuration - Use correct Channel ID
      const LINE_CHANNEL_ID = import.meta.env.VITE_LINE_CHANNEL_ID || '2008116224';
      const REDIRECT_URI = 'http://localhost:3001/api/auth/line/callback';
      const state = Math.random().toString(36).substring(7);
      
      // Store state for verification
      localStorage.setItem('line_login_state', state);
      
      const lineAuthUrl = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${LINE_CHANNEL_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${state}&scope=profile%20openid%20email`;
      
      console.log('🔍 LINE Login Debug:');
      console.log('- Channel ID:', LINE_CHANNEL_ID);
      console.log('- Redirect URI:', REDIRECT_URI);
      console.log('- State:', state);
      console.log('- Auth URL:', lineAuthUrl);
      
      window.location.href = lineAuthUrl;
    } catch (error) {
      console.error('Line login error:', error);
      setError('Line login failed. Please try again.');
    }
  };

  // Validation functions
  const validatePassword = (password: string) => {
    if (password.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }
    return '';
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    return '';
  };

  const checkDuplicateData = async (field: string, value: string) => {
    if (!value.trim()) return '';
    
    try {
      const response = await fetch(`http://localhost:3001/api/auth/check-duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ field, value })
      });
      
      const result = await response.json();
      if (result.exists) {
        switch (field) {
          case 'username':
            return 'This username is already taken';
          case 'email':
            return 'This email is already registered';
          case 'lineId':
            return 'This LINE ID is already registered';
          default:
            return 'This value is already in use';
        }
      }
      return '';
    } catch (error) {
      console.error('Error checking duplicate:', error);
      return 'Unable to verify uniqueness. Please try again.';
    }
  };

  const validateForm = async () => {
    const errors = {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      lineId: ''
    };

    // Basic validation
    if (!registerData.username.trim()) {
      errors.username = 'Username is required';
    } else if (registerData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters long';
    }

    if (!registerData.email.trim()) {
      errors.email = 'Email is required';
    } else {
      errors.email = validateEmail(registerData.email);
    }

    if (!registerData.password) {
      errors.password = 'Password is required';
    } else {
      errors.password = validatePassword(registerData.password);
    }

    if (!registerData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (registerData.password !== registerData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    // Check for duplicates
    setIsCheckingDuplicates(true);
    try {
      if (!errors.username) {
        errors.username = await checkDuplicateData('username', registerData.username);
      }
      if (!errors.email) {
        errors.email = await checkDuplicateData('email', registerData.email);
      }
      if (registerData.lineId && !errors.lineId) {
        errors.lineId = await checkDuplicateData('lineId', registerData.lineId);
      }
    } catch (error) {
      console.error('Error during validation:', error);
    } finally {
      setIsCheckingDuplicates(false);
    }

    setValidationErrors(errors);
    return !Object.values(errors).some(error => error !== '');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const isValid = await validateForm();
    if (!isValid) {
      return;
    }

    if (!registerData.username.trim() || !registerData.email.trim() || !registerData.password.trim()) {
      alert('Please fill all required fields');
      return;
    }
    if (registerData.phone && !showOTP) {
      try {
        const otpResponse = await api.sendOtp({ phone: registerData.phone });
        if (otpResponse.success) {
          setShowOTP(true);
          return;
        } else {
          alert('Failed to send OTP: ' + otpResponse.error);
          return;
        }
      } catch (error) {
        console.error('Error sending OTP:', error);
        alert('Failed to send OTP. Please try again.');
        return;
      }
    }
    if (showOTP && registerData.phone && otp.length !== 6) {
      alert('Please enter the 6-digit OTP sent to your phone');
      return;
    }
    if (showOTP && registerData.phone) {
      try {
        const verifyResponse = await api.verifyOtp({ phone: registerData.phone, otp });
        if (!verifyResponse.success) {
          alert('Invalid OTP. Please try again.');
          return;
        }
      } catch (error) {
        console.error('Error verifying OTP:', error);
        alert('Failed to verify OTP. Please try again.');
        return;
      }
    }
    setIsLoading(true);
    try {
      const response = await api.signup({
        username: registerData.username,
        email: registerData.email,
        password: registerData.password,
        name: registerData.name,
        surname: registerData.surname,
        address: registerData.address,
        phone: registerData.phone,
        lineId: registerData.lineId
      });
      if (response.success) {
        alert(`Registration successful!\nUsername: ${registerData.username}\nEmail: ${registerData.email}`);
        setShowRegister(false);
        setShowOTP(false);
        setOtp('');
        setRegisterData({
          username: '',
          email: '',
          password: '',
          name: '',
          surname: '',
          address: '',
          phone: '',
          lineId: '',
          confirmPassword: ''
        });
        setValidationErrors({
          username: '',
          email: '',
          password: '',
          confirmPassword: '',
          lineId: ''
        });
        setUsername(registerData.username);
      } else {
        alert('Registration failed: ' + response.error);
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Product Showcase Slider */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-r from-primary to-gray-50 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-16 w-32 h-32 bg-white/20 animate-pulse"></div>
          <div className="absolute bottom-32 right-20 w-24 h-24 bg-white/15 animate-bounce"></div>
          <div className="absolute top-1/2 left-8 w-16 h-16 bg-white/10 animate-ping"></div>
          <div className="absolute inset-0 opacity-10">
            <div className="w-full h-full" style={{
              backgroundImage: `linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%), linear-gradient(-45deg, rgba(255,255,255,0.1) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.1) 75%), linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.1) 75%)`,
              backgroundSize: '60px 60px',
              backgroundPosition: '0 0, 0 30px, 30px -30px, -30px 0px'
            }}></div>
          </div>
        </div>

        {/* Product Slider */}
        <div className="relative z-10 w-full h-full flex flex-col">

          {/* Slider Container */}
          <div className="flex-1 relative px-8 pb-8">
            <div className="relative h-full overflow-hidden">
              {/* Slide Content */}
              <div className="absolute inset-0 transition-all duration-700 ease-in-out" style={{
                transform: `translateX(-${currentSlide * 100}%)`
              }}>
                <div className="flex h-full">
                  {productSlides.map((slide, index) => (
                    <div key={slide.id} className="w-full h-full flex-shrink-0 p-8 flex flex-col justify-start pt-16">
                      {/* Product Image */}
                      <div className="mb-6 relative flex justify-center">
                        {["/acuCT_Split_Core.png", "/acuvim_3.png", "/acuvim_L.png", "/s200.png", "/acuvim_ii.png"].includes(slide.image) ? (
                          // Real product images
                          <div className="w-3/4 h-120 bg-white border border-primary/30 flex items-center justify-center relative overflow-hidden rounded-lg shadow-lg">
                            <img 
                              src={slide.image} 
                              alt={slide.title}
                              className="max-w-full max-h-full object-contain p-4"
                              onError={(e) => {
                                // Fallback if image fails to load
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement!.innerHTML = `
                                  <div class="text-center">
                                    <div class="w-16 h-16 mx-auto mb-3 bg-white/30 rounded-lg flex items-center justify-center">
                                      <svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                      </svg>
                                    </div>
                                    <p class="text-primary text-sm font-medium">${slide.title}</p>
                                  </div>
                                `;
                              }}
                            />
                          </div>
                        ) : (
                          // Placeholder for other products
                          <div className="w-3/4 h-40 bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30 flex items-center justify-center relative overflow-hidden rounded-lg shadow-lg">
                            {/* Animated background pattern */}
                            <div className="absolute inset-0 opacity-20">
                              <div className="w-full h-full" style={{
                                backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255, 255, 255, 0.1) 10px, rgba(255, 255, 255, 0.1) 20px)`
                              }}></div>
                            </div>
                            <div className="relative z-10 text-center">
                              <div className="w-16 h-16 mx-auto mb-3 bg-primary/30 rounded-lg flex items-center justify-center">
                                <Zap className="w-8 h-8 text-primary" />
                              </div>
                              <p className="text-primary text-sm font-medium">{slide.title}</p>
                            </div>
                            {/* Floating particles */}
                            <div className="absolute top-4 left-4 w-2 h-2 bg-primary/60 animate-ping"></div>
                            <div className="absolute bottom-6 right-6 w-1 h-1 bg-primary/40 animate-pulse"></div>
                            <div className="absolute top-1/2 right-4 w-1.5 h-1.5 bg-primary/50 animate-bounce"></div>
                          </div>
                        )}
                      </div>

                      {/* Slide Indicators - Below Image */}
                      <div className="flex justify-center space-x-3 mb-6">
                        {productSlides.map((_, indicatorIndex) => (
                          <button
                            key={indicatorIndex}
                            onClick={() => setCurrentSlide(indicatorIndex)}
                            className={`h-1 transition-all duration-500 ease-in-out transform hover:scale-y-150 ${
                              indicatorIndex === currentSlide
                                ? 'w-12 bg-white shadow-lg scale-y-125'
                                : 'w-8 bg-white/50 hover:bg-white/80 hover:w-10'
                            }`}
                          />
                        ))}
                      </div>

                      {/* Product Info */}
                      <div className="text-center">
                        <h3 className="text-2xl font-bold text-white drop-shadow-lg mb-3">{slide.title}</h3>
                        <p className="text-white/90 drop-shadow-md mb-6 leading-relaxed">{slide.description}</p>
                        
                        {/* Features */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                          {slide.features.map((feature, idx) => (
                            <div key={idx} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-3 text-center hover:bg-white/20 transition-all duration-300">
                              <span className="text-xs font-medium text-white drop-shadow-sm leading-tight">{feature}</span>
                            </div>
                          ))}
                        </div>

                        {/* Shop Now Button for all products */}
                        {slide.hasShopButton && (
                          <div className="mt-4">
                            <button
                              onClick={() => window.open('https://www.amptron.co.th/', '_blank')}
                              className="relative inline-flex items-center px-4 py-2 bg-gradient-to-r from-white to-white/90 text-primary text-sm font-bold rounded-full shadow-lg hover:shadow-xl hover:from-primary hover:to-primary/90 hover:text-white transform hover:scale-110 transition-all duration-500 group overflow-hidden"
                            >
                              {/* Animated background shine effect */}
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                              
                              <svg className="w-4 h-4 mr-1.5 group-hover:animate-bounce relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                              </svg>
                              <span className="relative z-10">Shop Now</span>
                              <svg className="w-3 h-3 ml-1.5 group-hover:translate-x-1 group-hover:scale-125 transition-all duration-300 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              
                              {/* Pulse effect on hover */}
                              <div className="absolute inset-0 rounded-full bg-primary/20 scale-0 group-hover:scale-110 group-hover:opacity-0 transition-all duration-500"></div>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-6 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <img src="/icon_webmeter.svg" alt="WebMeter" className="w-16 h-16 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">WebMeter</h1>
            </div>
          </div>
          <div className="bg-white shadow-2xl p-8 border border-gray-100 backdrop-blur-sm">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center mx-auto mb-6 shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 to-transparent animate-pulse"></div>
                <svg className="w-10 h-10 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {/* Corner decorations */}
                <div className="absolute top-0 right-0 w-4 h-4 bg-white/20"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 bg-white/20"></div>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome</h2>
              <p className="text-gray-600">Please login to your account</p>
              <div className="w-16 h-1 bg-gradient-to-r from-cyan-500 to-blue-500 mx-auto mt-4"></div>
            </div>
            {error && (
              <Alert className="mb-6 border-red-200 bg-red-50 text-red-800">
                <AlertDescription className="text-sm">
                  {error}
                  {isLocked && lockoutTime > 0 && (
                    <div className="mt-2 font-medium">
                      Account locked. Please wait {lockoutTime} seconds before trying again.
                    </div>
                  )}
                  {!isLocked && remainingAttempts < 3 && remainingAttempts > 0 && (
                    <div className="mt-1 text-xs">
                      {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining before account lockout.
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
            {showRegister ? (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="reg-username" className="text-sm font-semibold text-gray-700">
                        Username *
                      </Label>
                      <Input
                        id="reg-username"
                        type="text"
                        placeholder="Choose a unique username"
                        value={registerData.username}
                        onChange={e => setRegisterData(d => ({ ...d, username: e.target.value }))}
                        className={`h-11 bg-gray-50 border-gray-300 focus:border-cyan-500 focus:ring-cyan-500/20 rounded-lg transition-all duration-300 ${
                          validationErrors.username ? 'border-red-500 focus:border-red-500' : ''
                        }`}
                        required
                      />
                      {validationErrors.username && (
                        <p className="text-red-500 text-sm mt-1 flex items-center">
                          <AlertTriangle className="w-4 h-4 mr-1" />
                          {validationErrors.username}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-email" className="text-sm font-semibold text-gray-700">
                        Email Address *
                      </Label>
                      <Input
                        id="reg-email"
                        type="email"
                        placeholder="Enter your email address"
                        value={registerData.email}
                        onChange={e => setRegisterData(d => ({ ...d, email: e.target.value }))}
                        className={`h-11 bg-gray-50 border-gray-300 focus:border-cyan-500 focus:ring-cyan-500/20 rounded-lg transition-all duration-300 ${
                          validationErrors.email ? 'border-red-500 focus:border-red-500' : ''
                        }`}
                        required
                      />
                      {validationErrors.email && (
                        <p className="text-red-500 text-sm mt-1 flex items-center">
                          <AlertTriangle className="w-4 h-4 mr-1" />
                          {validationErrors.email}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-password" className="text-sm font-semibold text-gray-700">
                        Password *
                      </Label>
                      <div className="relative">
                        <Input
                          id="reg-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Create a strong password"
                          value={registerData.password}
                          onChange={e => setRegisterData(d => ({ ...d, password: e.target.value }))}
                          className={`h-11 bg-gray-50 border-gray-300 focus:border-cyan-500 focus:ring-cyan-500/20 pr-12 transition-all duration-300 ${
                            validationErrors.password ? 'border-red-500 focus:border-red-500' : ''
                          }`}
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 hover:bg-gray-100 transition-all duration-200"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-500" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-500" />
                          )}
                        </Button>
                      </div>
                      {validationErrors.password && (
                        <p className="text-red-500 text-sm mt-1 flex items-center">
                          <AlertTriangle className="w-4 h-4 mr-1" />
                          {validationErrors.password}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-name" className="text-sm font-semibold text-gray-700">
                        First Name *
                      </Label>
                      <Input
                        id="reg-name"
                        type="text"
                        placeholder="Enter your first name"
                        value={registerData.name}
                        onChange={e => setRegisterData(d => ({ ...d, name: e.target.value }))}
                        className="h-11 bg-gray-50 border-gray-300 focus:border-cyan-500 focus:ring-cyan-500/20 rounded-lg transition-all duration-300"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="reg-surname" className="text-sm font-semibold text-gray-700">
                        Last Name *
                      </Label>
                      <Input
                        id="reg-surname"
                        type="text"
                        placeholder="Enter your last name"
                        value={registerData.surname}
                        onChange={e => setRegisterData(d => ({ ...d, surname: e.target.value }))}
                        className="h-11 bg-gray-50 border-gray-300 focus:border-cyan-500 focus:ring-cyan-500/20 rounded-lg transition-all duration-300"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-address" className="text-sm font-semibold text-gray-700">
                        Address
                      </Label>
                      <Input
                        id="reg-address"
                        type="text"
                        placeholder="Enter your address"
                        value={registerData.address}
                        onChange={e => setRegisterData(d => ({ ...d, address: e.target.value }))}
                        className="h-11 bg-gray-50 border-gray-300 focus:border-cyan-500 focus:ring-cyan-500/20 rounded-lg transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-phone" className="text-sm font-semibold text-gray-700">
                        Phone Number
                      </Label>
                      <Input
                        id="reg-phone"
                        type="tel"
                        placeholder="Enter your phone number"
                        value={registerData.phone}
                        onChange={e => setRegisterData(d => ({ ...d, phone: e.target.value }))}
                        className="h-11 bg-gray-50 border-gray-300 focus:border-cyan-500 focus:ring-cyan-500/20 rounded-lg transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-line" className="text-sm font-semibold text-gray-700">
                        Line ID
                      </Label>
                      <Input
                        id="reg-line"
                        type="text"
                        placeholder="Enter your Line ID"
                        value={registerData.lineId}
                        onChange={e => setRegisterData(d => ({ ...d, lineId: e.target.value }))}
                        className={`h-11 bg-gray-50 border-gray-300 focus:border-cyan-500 focus:ring-cyan-500/20 rounded-lg transition-all duration-300 ${
                          validationErrors.lineId ? 'border-red-500 focus:border-red-500' : ''
                        }`}
                      />
                      {validationErrors.lineId && (
                        <p className="text-red-500 text-sm mt-1 flex items-center">
                          <AlertTriangle className="w-4 h-4 mr-1" />
                          {validationErrors.lineId}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-confirm-password" className="text-sm font-semibold text-gray-700">
                    Confirm Password *
                  </Label>
                  <div className="relative">
                    <Input
                      id="reg-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm your password"
                      value={registerData.confirmPassword || ''}
                      onChange={e => setRegisterData(d => ({ ...d, confirmPassword: e.target.value }))}
                      className={`h-11 bg-gray-50 border-gray-300 focus:border-cyan-500 focus:ring-cyan-500/20 rounded-lg pr-12 transition-all duration-300 ${
                        validationErrors.confirmPassword ? 'border-red-500 focus:border-red-500' : ''
                      }`}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 hover:bg-gray-100 rounded-md transition-all duration-200"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-500" />
                      )}
                    </Button>
                  </div>
                  {validationErrors.confirmPassword && (
                    <p className="text-red-500 text-sm mt-1 flex items-center">
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      {validationErrors.confirmPassword}
                    </p>
                  )}
                </div>
                {showOTP && registerData.phone && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">
                      Enter OTP
                    </Label>
                    <InputOTP
                      maxLength={6}
                      value={otp}
                      onChange={(value) => setOtp(value)}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSeparator />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                    <p className="text-xs text-gray-500">
                      We've sent a 6-digit code to {registerData.phone}
                    </p>
                  </div>
                )}
                <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button
                    type="submit"
                    disabled={isLoading || isCheckingDuplicates}
                    className="h-11 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                  >
                    {isLoading || isCheckingDuplicates ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>
                          {isCheckingDuplicates 
                            ? 'Validating...' 
                            : showOTP && registerData.phone 
                            ? 'Verifying...' 
                            : 'Creating...'
                          }
                        </span>
                      </div>
                    ) : (
                      showOTP && registerData.phone ? 'Verify & Create' : 'Create Account'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 text-gray-700 hover:bg-gray-50 font-semibold transition-all duration-300 hover:shadow-md"
                    onClick={() => {
                      setShowRegister(false);
                      setShowOTP(false);
                      setOtp('');
                    }}
                  >
                    ← Back to Sign In
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-sm font-semibold text-gray-700">
                      Username
                    </Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="h-12 bg-gray-50 border-gray-300 focus:border-cyan-500 focus:ring-cyan-500/20 transition-all duration-300"
                      disabled={isLocked || isLoading}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-semibold text-gray-700">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-12 bg-gray-50 border-gray-300 focus:border-cyan-500 focus:ring-cyan-500/20 pr-12 transition-all duration-300"
                        disabled={isLocked || isLoading}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100 transition-all duration-200"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-500" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-500" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      className="data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
                    />
                    <Label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer hover:text-gray-800 transition-colors">
                      Remember me
                    </Label>
                   
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    className="px-0 text-sm text-cyan-500 hover:text-cyan-600 font-semibold transition-colors hover:underline"
                  >
                    Forgot password?
                  </Button>
                </div>
                <Button
                  type="submit"
                  disabled={isLoading || isLocked}
                  className="w-full h-12 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                  {isLocked ? (
                    <div className="flex items-center space-x-2">
                      <span>Account Locked ({lockoutTime}s)</span>
                    </div>
                  ) : isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Signing In...</span>
                    </div>
                  ) : (
                    'Login'
                  )}
                </Button>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500 font-medium">Or continue with</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isLocked}
                    className="h-12 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
                    onClick={handleGuestLogin}
                  >
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    Guest Login
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-semibold transition-all duration-300 hover:shadow-md"
                    onClick={() => setShowRegister(true)}
                  >
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                    </svg>
                    Create New Account
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={googleLoading || isLocked}
                    className="h-12 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
                    onClick={handleGoogleSignup}
                  >
                    {googleLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-gray-400/30 border-t-gray-600 rounded-full animate-spin"></div>
                        <span>Connecting...</span>
                      </div>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Sign up with Google
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isLoading}
                    className="h-12 border-green-500 text-green-600 hover:bg-green-50 hover:border-green-600 font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
                    onClick={handleLineLogin}
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                    </svg>
                    {isLoading ? 'Signing in...' : 'Sign in with Line'}
                  </Button>
                </div>
              </form>
            )}
          </div>
          <div className="text-center mt-8">
            <p className="text-sm text-gray-500">
              © 2025 WebMeter • <span className="text-cyan-500 font-medium">Amptron Instrument Thailand Co., Ltd.</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;