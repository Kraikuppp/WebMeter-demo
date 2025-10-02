import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const error = params.get('error');
    const username = params.get('username');
    const level = params.get('level');

    console.log('🔗 AuthCallback received:', { token: !!token, username, level, error });

    if (token) {
      // Store auth token
      localStorage.setItem('auth_token', token);
      
      // Store username if provided
      if (username) {
        localStorage.setItem('userUsername', username);
      }
      
      // Set guest status based on level
      const isGuest = (level || '').toLowerCase() === 'guest';
      localStorage.setItem('isGuest', isGuest ? 'true' : 'false');
      
      console.log('✅ LINE login successful:', { username, isGuest });
      navigate('/home', { replace: true });
    } else {
      console.error('❌ LINE login failed:', error);
      navigate('/login', { replace: true, state: { error: error || 'LINE login failed' } });
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Processing LINE login...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
