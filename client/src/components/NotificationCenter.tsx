import React, { useState } from 'react';
import { 
  X, 
  Bell, 
  CheckCheck, 
  AlertCircle, 
  PlayCircle, 
  UserPlus, 
  Clock, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { Notification } from '../types';
import { useNotifications } from '../context/NotificationContext';
import { useTasks } from '../context/TaskContext';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose
}) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { tasks, openTaskDetail } = useTasks();
  const [filterTab, setFilterTab] = useState<'ALL' | 'UNREAD' | 'ASSIGNMENT' | 'OVERDUE'>('ALL');

  if (!isOpen) return null;

  const filteredNotifs = notifications.filter(n => {
    if (filterTab === 'UNREAD') return !n.read;
    if (filterTab === 'ASSIGNMENT') return n.type === 'ASSIGNMENT';
    if (filterTab === 'OVERDUE') return n.type === 'OVERDUE';
    return true;
  });

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.read) {
      await markAsRead(notif.id);
    }
    if (notif.taskId) {
      const task = tasks.find(t => t.id === notif.taskId);
      if (task) {
        openTaskDetail(task);
        onClose();
      }
    }
  };

  const getNotifIcon = (type: Notification['type']) => {
    switch (type) {
      case 'ASSIGNMENT':
        return <UserPlus className="w-4 h-4 text-sky-400" />;
      case 'OVERDUE':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'STATUS_CHANGE':
        return <PlayCircle className="w-4 h-4 text-emerald-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-hidden bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div 
          className="w-screen max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 relative">
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                )}
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-xs bg-sky-500/20 text-sky-300 px-2 py-0.2 rounded-full font-mono">
                      {unreadCount} unread
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-400">
                  Real-time alerts (&lt; 30s guarantee)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Read all</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center px-4 py-2 border-b border-slate-800 bg-slate-950/20 gap-1 overflow-x-auto">
            <button
              onClick={() => setFilterTab('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                filterTab === 'ALL'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilterTab('UNREAD')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                filterTab === 'UNREAD'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setFilterTab('ASSIGNMENT')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                filterTab === 'ASSIGNMENT'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Assignments
            </button>
            <button
              onClick={() => setFilterTab('OVERDUE')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                filterTab === 'OVERDUE'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Overdue
            </button>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-slate-800/40">
            {filteredNotifs.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center p-6">
                <Bell className="w-8 h-8 text-slate-700 mb-2" />
                <p className="text-xs font-semibold text-slate-400">No notifications in this view</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Assignment and status changes will appear here instantly.
                </p>
              </div>
            ) : (
              filteredNotifs.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    notif.read
                      ? 'bg-slate-950/40 border-slate-800/60 opacity-80 hover:opacity-100 hover:bg-slate-800/40'
                      : 'bg-slate-800/60 border-sky-500/40 shadow-md shadow-sky-950/20 hover:bg-slate-800'
                  }`}
                >
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex-shrink-0 mt-0.5">
                    {getNotifIcon(notif.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <h4 className={`text-xs font-bold truncate ${notif.read ? 'text-slate-300' : 'text-slate-100'}`}>
                        {notif.title}
                      </h4>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-sky-400 flex-shrink-0 animate-pulse" />
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                      {notif.message}
                    </p>

                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>

                      {notif.taskId && (
                        <span className="text-sky-400 flex items-center gap-1 font-semibold hover:underline">
                          <span>View Task</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
