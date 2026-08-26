import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  users: User[];
  isLoading: boolean;
  isAdmin: boolean;
  login: (userId: string) => Promise<void>;
  logout: () => void;
  switchUser: (userId: string) => Promise<void>;
  createUser: (data: { name: string; email: string; role: 'ADMIN' | 'MEMBER'; title?: string; avatar?: string }) => Promise<User>;
  refreshUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUsers = useCallback(async () => {
    try {
      const list = await api.getUsers();
      setUsers(list);
      // Sync active user if present
      setUser(current => {
        if (!current) return null;
        const found = list.find(u => u.id === current.id);
        return found ? { ...current, ...found } : current;
      });
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  }, []);

  const login = async (userId: string) => {
    setIsLoading(true);
    try {
      const res = await api.login(userId);
      setUser(res.user);
      setToken(res.token);
      localStorage.setItem('token', res.token);
      localStorage.setItem('userId', res.user.id);
      const list = await api.getUsers();
      setUsers(list);
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
  };

  const switchUser = async (userId: string) => {
    try {
      const res = await api.switchUser(userId);
      setUser(res.user);
      setToken(res.token);
      localStorage.setItem('token', res.token);
      localStorage.setItem('userId', res.user.id);
      
      const list = await api.getUsers();
      setUsers(list);
    } catch (err) {
      console.error('User switch error:', err);
      throw err;
    }
  };

  const createUser = async (data: { name: string; email: string; role: 'ADMIN' | 'MEMBER'; title?: string; avatar?: string }): Promise<User> => {
    try {
      const res = await api.createUser(data);
      setUser(res.user);
      setToken(res.token);
      localStorage.setItem('token', res.token);
      localStorage.setItem('userId', res.user.id);

      const list = await api.getUsers();
      setUsers(list);
      return res.user;
    } catch (err) {
      console.error('Create user error:', err);
      throw err;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const userList = await api.getUsers();
        setUsers(userList);

        const savedUserId = localStorage.getItem('userId') || 'user-admin-1';
        const target = userList.find(u => u.id === savedUserId) || userList[0];
        
        if (target) {
          const res = await api.login(target.id);
          setUser(res.user);
          setToken(res.token);
          localStorage.setItem('token', res.token);
          localStorage.setItem('userId', res.user.id);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        users,
        isLoading,
        isAdmin,
        login,
        logout,
        switchUser,
        createUser,
        refreshUsers
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
