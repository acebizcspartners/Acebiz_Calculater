'use client';

import { useState, useEffect } from 'react';
import PasswordAuth from './PasswordAuth';

interface AuthWrapperProps {
  children: React.ReactNode;
  navBar: React.ReactNode;
}

export default function AuthWrapper({ children, navBar }: AuthWrapperProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const auth = localStorage.getItem('acebiz_authenticated');
      setIsAuthenticated(auth === 'true');
      setIsLoading(false);
    };

    checkAuth();

    // Listen for storage changes (logout from another tab/window)
    const handleStorageChange = () => {
      const auth = localStorage.getItem('acebiz_authenticated');
      setIsAuthenticated(auth === 'true');
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-white mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-white mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <PasswordAuth
        onAuthenticated={() => {
          setIsAuthenticated(true);
          localStorage.setItem('acebiz_authenticated', 'true');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {navBar}
      <main>{children}</main>
    </div>
  );
}
