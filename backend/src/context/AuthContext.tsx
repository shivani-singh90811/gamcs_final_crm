import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthResponse, UserRole } from '../types';
import { apiService, getStoredConfig, saveConfig } from '../services/api';

const AUTH_TOKEN_KEY = 'gamcs_crm_jwt_token';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithGoogle: (googleData: { email: string; name?: string; avatarUrl?: string; role?: string }) => Promise<boolean>;
  register: (userData: { name: string; email: string; password: string; role: UserRole; title?: string; department?: string }) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(AUTH_TOKEN_KEY));
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const currentUser = await apiService.getCurrentUser();
        if (currentUser && currentUser.id) {
          setUser(currentUser);
          setToken(storedToken);
        } else {
          localStorage.removeItem(AUTH_TOKEN_KEY);
          setToken(null);
          setUser(null);
        }
      } catch (e) {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res: AuthResponse = await apiService.login(email, password);
      if (res && res.token) {
        setToken(res.token);
        setUser(res.user);
        const cfg = getStoredConfig();
        saveConfig({ ...cfg, jwtToken: res.token });
        return true;
      }
      return false;
    } catch (err) {
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (googleData: { email: string; name?: string; avatarUrl?: string; role?: string }): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res: AuthResponse = await apiService.googleLogin(googleData);
      if (res && res.token) {
        setToken(res.token);
        setUser(res.user);
        const cfg = getStoredConfig();
        saveConfig({ ...cfg, jwtToken: res.token });
        return true;
      }
      return false;
    } catch (err) {
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: { name: string; email: string; password: string; role: UserRole; title?: string; department?: string }): Promise<boolean> => {
    setIsLoading(true);
    try {
      await apiService.register(userData);
      // Auto login after successful registration
      return await login(userData.email, userData.password);
    } catch (err) {
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    const cfg = getStoredConfig();
    saveConfig({ ...cfg, jwtToken: null });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        loginWithGoogle,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

