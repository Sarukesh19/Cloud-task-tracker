import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Notification } from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

export interface ToastItem {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  toasts: ToastItem[];
  isConnected: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismissToast: (id: string) => void;
  showToast: (title: string, message: string, type?: ToastItem['type']) => void;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Web Audio API chime tone
function playChimeSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    // audio context might be blocked if no user gesture yet
  }
}

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const recentToastKeysRef = useRef<Set<string>>(new Set());

  const showToast = useCallback((title: string, message: string, type: ToastItem['type'] = 'info') => {
    // Deduplication key
    const key = `${title}:${message}`;
    if (recentToastKeysRef.current.has(key)) {
      return; // Skip duplicate spam
    }
    recentToastKeysRef.current.add(key);
    setTimeout(() => {
      recentToastKeysRef.current.delete(key);
    }, 3000);

    const newToast: ToastItem = {
      id: `toast-${Date.now()}-${Math.random()}`,
      type,
      title,
      message,
      timestamp: new Date().toISOString()
    };
    setToasts(prev => [newToast, ...prev.slice(0, 3)]); // Keep max 4 toasts at once

    // Auto dismiss after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== newToast.id));
    }, 5000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.getNotifications(token);
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }, [token]);

  useEffect(() => {
    if (user && token) {
      refreshNotifications();
    } else {
      setNotifications([]);
    }
  }, [user, token, refreshNotifications]);

  // WebSocket Connection
  useEffect(() => {
    if (!user) {
      setIsConnected(false);
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?userId=${user.id}`;
    
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setIsConnected(true);
          ws?.send(JSON.stringify({ type: 'SET_USER', userId: user.id }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'NOTIFICATION_RECEIVED') {
              const notif: Notification = data.payload.notification || data.payload;
              // Only process if addressed specifically to this user
              if (notif.userId === user.id) {
                playChimeSound();
                setNotifications(prev => {
                  if (prev.some(n => n.id === notif.id)) return prev;
                  return [notif, ...prev];
                });
                showToast(
                  notif.title, 
                  notif.message, 
                  notif.type === 'OVERDUE' ? 'error' : 'info'
                );
              }
            } else if (data.type === 'TASK_OVERDUE') {
              const task = data.payload.task;
              if (task.assigneeId === user.id) {
                showToast('Task Overdue Alert 🚨', `"${task.title}" is past its due date!`, 'error');
              }
            }
          } catch (e) {
            console.error('WebSocket message parsing error:', e);
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          reconnectTimeout = setTimeout(connect, 3000);
        };

        ws.onerror = () => {
          setIsConnected(false);
        };
      } catch (err) {
        setIsConnected(false);
        reconnectTimeout = setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) {
        ws.close();
      }
    };
  }, [user?.id, showToast]);

  const markAsRead = async (id: string) => {
    if (!token) return;
    try {
      await api.markNotificationRead(id, token);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!token) return;
    try {
      await api.markAllNotificationsRead(token);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        toasts,
        isConnected,
        markAsRead,
        markAllAsRead,
        dismissToast,
        showToast,
        refreshNotifications
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
