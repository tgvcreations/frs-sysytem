import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api, getAuthToken, setAuthToken, removeAuthToken } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  switchRoleQuickly: (role: UserRole) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchProfile = async () => {
    try {
      if (!getAuthToken()) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      const data = await api.getMe();
      setUser(data.user);
    } catch (err) {
      console.warn('Profile fetch failed, logging out:', err);
      removeAuthToken();
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const data = await api.login({ email, password: pass });
      setAuthToken(data.token);
      setToken(data.token);
      setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    removeAuthToken();
    setToken(null);
    setUser(null);
  };

  // Quick switch role utility to make testing all 5 roles effortless!
  const switchRoleQuickly = async (role: UserRole) => {
    setIsLoading(true);
    try {
      let email = 'superadmin@vuppala.edu';
      let pass = 'Admin@12345';

      if (role === 'super_admin') email = 'superadmin@vuppala.edu';
      else if (role === 'admin') email = 'admin@vuppala.edu';
      else if (role === 'principal') email = 'principal@vuppala.edu';
      else if (role === 'attendance_manager') email = 'manager@vuppala.edu';
      else if (role === 'staff') {
        email = 'suresh.k@vuppala.edu';
        pass = 'Staff@12345';
      }

      await login(email, pass);
    } catch (err: any) {
      console.error('Switch role failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        switchRoleQuickly,
        refreshProfile: fetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

