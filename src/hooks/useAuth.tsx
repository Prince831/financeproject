import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import axios from 'axios';

interface User {
  id: number;
  name: string;
  email: string;
  email_verified_at?: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, password_confirmation: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8002/api';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state from localStorage with server validation
  useEffect(() => {
    const validateStoredAuth = async () => {
      console.log('AuthProvider: Initializing auth state');
      const storedToken = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('auth_user');

      console.log('AuthProvider: Stored token exists:', !!storedToken, 'Stored user exists:', !!storedUser);

      if (storedToken && storedUser) {
        try {
          console.log('AuthProvider: Validating stored token with server');
          // Set axios header temporarily for validation
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;

          // Validate token by calling user endpoint
          await axios.get(`${API_BASE}/user`);

          console.log('AuthProvider: Token validated successfully, restoring auth state');
          // Token is valid, restore authentication state
          setToken(storedToken);
          setUser(JSON.parse(storedUser));

        } catch (error) {
          console.log('AuthProvider: Stored token invalid, clearing stored data');
          // Token invalid or server error, clear stored data
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          delete axios.defaults.headers.common['Authorization'];
        }
      } else {
        console.log('AuthProvider: No stored auth data found');
      }

      setIsLoading(false);
      console.log('AuthProvider: Auth initialization complete, isLoading set to false');
    };

    validateStoredAuth();
  }, []);

  // Set up axios header when token changes
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      console.log('AuthProvider: Axios header set for token');
    } else {
      delete axios.defaults.headers.common['Authorization'];
      console.log('AuthProvider: Axios header cleared');
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    try {
      console.log('AuthProvider: Starting login for email:', email);
      setIsLoading(true);
      setError(null);

      const response = await axios.post(`${API_BASE}/login`, {
        email,
        password
      });

      console.log('AuthProvider: Login API response received');
      const { user: userData, token: authToken } = response.data;

      console.log('AuthProvider: Setting user and token');
      setUser(userData);
      setToken(authToken);

      // Store in localStorage
      localStorage.setItem('auth_token', authToken);
      localStorage.setItem('auth_user', JSON.stringify(userData));

      // Set axios default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;

      console.log('AuthProvider: Login successful, user authenticated');

    } catch (err: any) {
      console.error('AuthProvider: Login failed', err);
      const errorMessage = err.response?.data?.message || 'Login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
      console.log('AuthProvider: Login process complete, isLoading set to false');
    }
  };

  const register = async (name: string, email: string, password: string, password_confirmation: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await axios.post(`${API_BASE}/register`, {
        name,
        email,
        password,
        password_confirmation
      });

      const { user: userData, token: authToken } = response.data;

      setUser(userData);
      setToken(authToken);

      // Store in localStorage
      localStorage.setItem('auth_token', authToken);
      localStorage.setItem('auth_user', JSON.stringify(userData));

      // Set axios default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;

    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Registration failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);

      if (token) {
        await axios.post(`${API_BASE}/logout`);
      }

      // Clear local state
      setUser(null);
      setToken(null);

      // Clear localStorage
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');

      // Clear axios header
      delete axios.defaults.headers.common['Authorization'];

    } catch (err: any) {
      console.error('Logout error:', err);
      // Still clear local state even if API call fails
      setUser(null);
      setToken(null);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    isAuthenticated: !!user && !!token,
    isLoading,
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default useAuth;