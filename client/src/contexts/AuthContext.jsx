import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const API_BASE = import.meta.env.PROD
  ? 'https://hr-onboarding-dev-r2x0-api.azurewebsites.net'
  : 'http://localhost:3001';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Configure axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Check if user is authenticated on app load
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        try {
          // Set token and user immediately for better UX
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;

          // Verify token in background (non-blocking)
          setTimeout(async () => {
            try {
              await axios.get(`${API_BASE}/auth/me`);
            } catch (error) {
              // Token is invalid, clear storage
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              delete axios.defaults.headers.common['Authorization'];
              setToken(null);
              setUser(null);
            }
          }, 100);
        } catch (error) {
          // Invalid stored data, clear storage
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          delete axios.defaults.headers.common['Authorization'];
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    try {
      // Set loading state immediately for better UX
      setLoading(true);

      const response = await axios.post(
        `${API_BASE}/auth/login`,
        {
          email,
          password,
        },
        {
          timeout: 10000, // 10 second timeout
        }
      );

      const { token: newToken, user: userData } = response.data;

      // Set state and storage simultaneously for faster response
      setToken(newToken);
      setUser(userData);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

      // Store in localStorage asynchronously
      Promise.resolve().then(() => {
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(userData));
      });

      setLoading(false);
      return { success: true, user: userData };
    } catch (error) {
      setLoading(false);
      const message = error.response?.data?.error || 'Login failed';
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await axios.post(`${API_BASE}/auth/logout`);
      }
    } catch (error) {
      console.warn('Logout request failed:', error);
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  const register = async userData => {
    try {
      const response = await axios.post(`${API_BASE}/users`, userData);
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.error || 'Registration failed';
      return { success: false, error: message };
    }
  };

  const hasPermission = permission => {
    if (!user) return false;

    // Admin has all permissions
    if (user.role === 'admin') return true;

    // HR Manager permissions
    if (user.role === 'hr_manager') {
      return [
        'templates:view',
        'templates:create',
        'templates:edit',
        'templates:delete',
        'templates:approve',
        'templates:clone',
        'checklists:create',
        'checklists:assign',
        'users:create',
        'users:read:all',
      ].includes(permission);
    }

    // Employee permissions
    if (user.role === 'employee') {
      return [
        'templates:view',
        'templates:read',
        'checklists:read:own',
        'checklists:update:own',
      ].includes(permission);
    }

    return false;
  };

  const isRole = role => {
    return user?.role === role;
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    register,
    hasPermission,
    isRole,
    isAuthenticated: !!token && !!user,
    isAdmin: user?.role === 'admin',
    isHRManager: user?.role === 'hr_manager',
    isEmployee: user?.role === 'employee',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
