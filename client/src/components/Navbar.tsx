import React, { useState } from 'react';
import { 
  Bell, 
  Plus, 
  BarChart3, 
  Layers, 
  ListTodo, 
  Mail, 
  Cpu, 
  Search, 
  RefreshCw,
  LogOut,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../context/TaskContext';
import { useNotifications } from '../context/NotificationContext';
import { api } from '../services/api';
import { getInitials, getAvatarGradient } from '../utils/avatar';

interface NavbarProps {
  currentView: 'kanban' | 'list' | 'analytics';
  setCurrentView: (view: 'kanban' | 'list' | 'analytics') => void;
  onOpenCreateTask: () => void;
  onOpenNotifications: () => void;
  onOpenQueueMonitor: () => void;
  onOpenEmailInbox: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  setCurrentView,
  onOpenCreateTask,
  onOpenNotifications,
  onOpenQueueMonitor,
  onOpenEmailInbox
}) => {
  const { user, users, switchUser, isAdmin, logout } = useAuth();
  const { searchQuery, setSearchQuery, refreshTasks } = useTasks();
  const { unreadCount, isConnected, showToast } = useNotifications();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleResetDemo = async () => {
    if (confirm('Reset system data to initial demo state?')) {
      setIsResetting(true);
      try {
        await api.resetDemoData();
        await refreshTasks();
        showToast('Demo Reset ✅', 'Database has been restored to default seed.', 'success');
      } catch (e: any) {
        showToast('Reset Failed ❌', e.message, 'error');
      } finally {
        setIsResetting(false);
      }
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/80 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 ring-1 ring-white/20">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-sky-100 to-sky-400 bg-clip-text text-transparent">
                  CloudTrack
                </span>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  Real-Time
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Collaborative Task Tracker &amp; Notifications
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search tasks, descriptions, assignees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 transition-all outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* View Toggles & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* View Switcher Tabs */}
            <div className="hidden lg:flex items-center bg-slate-950/60 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setCurrentView('kanban')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentView === 'kanban'
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Kanban</span>
              </button>
              <button
                onClick={() => setCurrentView('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentView === 'list'
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <ListTodo className="w-3.5 h-3.5" />
                <span>List</span>
              </button>
              <button
                onClick={() => setCurrentView('analytics')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentView === 'analytics'
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Analytics</span>
              </button>
            </div>

            {/* Admin-Only Tool: Queue Worker & Retries */}
            {isAdmin && (
              <button
                onClick={onOpenQueueMonitor}
                title="Async Notification Queue & Retry Inspector (Admin Tool)"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30 transition shadow-sm"
              >
                <Cpu className="w-3.5 h-3.5 text-purple-400" />
                <span className="hidden sm:inline">Queue Worker</span>
              </button>
            )}

            {/* Email Outbox (Available to all) */}
            <button
              onClick={onOpenEmailInbox}
              title="Mock Team Email Dispatcher (Stretch Goal)"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/70 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700/60 transition shadow-sm"
            >
              <Mail className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Mock Emails</span>
            </button>

            {/* Notification Bell */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 rounded-xl bg-slate-800/70 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-md animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Create Task Button */}
            <button
              onClick={onOpenCreateTask}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-sky-500/20 transition-transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>New Task</span>
            </button>

            {/* Active User Pill & Menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-800/70 hover:bg-slate-700 border border-slate-700/60 transition"
              >
                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${getAvatarGradient(user?.name || '')} flex items-center justify-center text-xs font-bold shadow-sm`}>
                  {getInitials(user?.name || '')}
                </div>
                <div className="text-left hidden xl:block pr-1">
                  <div className="text-xs font-bold text-slate-200 leading-tight">
                    {user?.name}
                  </div>
                  <div className="text-[10px] text-sky-400 font-semibold leading-tight">
                    {isAdmin ? '👑 Admin / Lead' : '👤 Member'}
                  </div>
                </div>
              </button>

              {/* Dropdown Menu */}
              {userMenuOpen && (
                <div 
                  className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <div className="px-3 py-2 border-b border-slate-800">
                    <p className="text-xs text-slate-400">Logged in as</p>
                    <p className="text-sm font-bold text-slate-100">{user?.name}</p>
                    <p className="text-xs text-sky-400 font-medium">{user?.title}</p>
                    <div className="mt-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isAdmin ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                      }`}>
                        {isAdmin ? '👑 Admin Privileges' : '👤 Standard Member'}
                      </span>
                    </div>
                  </div>

                  <div className="py-2">
                    <p className="px-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Switch Active Persona
                    </p>
                    {users.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => switchUser(u.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs transition ${
                          u.id === user?.id
                            ? 'bg-sky-500/15 text-sky-400 font-bold'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${getAvatarGradient(u.name)} flex items-center justify-center text-[10px] font-bold flex-shrink-0`}>
                          {getInitials(u.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium">{u.name}</p>
                          <p className="text-[10px] text-slate-400">{u.role === 'ADMIN' ? '👑 Admin' : '👤 Member'}</p>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Admin Only Demo Reset */}
                  {isAdmin && (
                    <div className="pt-2 border-t border-slate-800">
                      <button
                        onClick={handleResetDemo}
                        disabled={isResetting}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs text-red-400 hover:bg-red-500/10 transition"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
                        <span>Reset Demo Database</span>
                      </button>
                    </div>
                  )}

                  {/* Logout Button */}
                  <div className="pt-2 border-t border-slate-800">
                    <button
                      onClick={() => logout()}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs text-slate-300 hover:bg-slate-800 transition font-semibold"
                    >
                      <LogOut className="w-3.5 h-3.5 text-slate-400" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Connection Indicator */}
            <div
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-950/40 border border-slate-800 text-[11px]"
              title={isConnected ? 'Real-Time WebSocket Connected' : 'Connecting to WebSocket Hub...'}
            >
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="text-[10px] text-slate-400 font-mono hidden md:inline">
                {isConnected ? 'LIVE' : 'SYNCING'}
              </span>
            </div>

          </div>
        </div>
      </div>
    </header>
  );
};
