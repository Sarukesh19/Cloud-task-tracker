import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../context/TaskContext';
import { useNotifications } from '../context/NotificationContext';
import { UserPlus } from 'lucide-react';
import { getInitials, getAvatarGradient } from '../utils/avatar';

interface UserSwitcherBarProps {
  onOpenAddUser?: () => void;
}

export const UserSwitcherBar: React.FC<UserSwitcherBarProps> = ({ onOpenAddUser }) => {
  const { user, users, switchUser } = useAuth();
  const { tasks } = useTasks();
  const { showToast } = useNotifications();

  const handleSwitch = async (userId: string, name: string, role: string) => {
    if (userId === user?.id) return;
    try {
      await switchUser(userId);
      showToast(
        'Persona Switched 👤',
        `You are now logged in as ${name} (${role === 'ADMIN' ? '👑 Admin' : '👤 Member'})`,
        'info'
      );
    } catch (err: any) {
      showToast('Switch Failed ❌', err.message, 'error');
    }
  };

  return (
    <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        
        {/* Helper Label */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="flex h-2 w-2 rounded-full bg-sky-400"></span>
          <span className="font-semibold text-slate-300">Fast Persona Switcher:</span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            (Click any user to test role permissions & active task caps)
          </span>
        </div>

        {/* User Pill Buttons + Add User Button */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          {users.map((u) => {
            const isSelected = u.id === user?.id;
            const activeCount = tasks.filter(
              t => t.assigneeId === u.id && (t.status === 'PENDING' || t.status === 'IN_PROGRESS')
            ).length;
            const isFull = activeCount >= 5;

            return (
              <button
                key={u.id}
                type="button"
                onClick={() => handleSwitch(u.id, u.name, u.role)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs transition-all flex-shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-sky-500/20 border-sky-400 text-white shadow-md shadow-sky-500/20 ring-2 ring-sky-500/50'
                    : 'bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:border-slate-500 hover:text-white'
                }`}
              >
                <div className="relative">
                  <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${getAvatarGradient(u.name)} flex items-center justify-center text-[9px] font-bold shadow-sm`}>
                    {getInitials(u.name)}
                  </div>
                  {isSelected && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full ring-1 ring-slate-900" />
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-bold truncate max-w-[90px]">{u.name}</span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                      u.role === 'ADMIN'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-700/60 text-slate-300'
                    }`}
                  >
                    {u.role === 'ADMIN' ? 'Admin' : 'Member'}
                  </span>
                </div>

                {/* Active Task Capacity Tag */}
                <div
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                    isFull
                      ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                      : activeCount >= 4
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                  title={`${activeCount} / 5 active tasks (Pending + In Progress)`}
                >
                  {activeCount}/5
                </div>
              </button>
            );
          })}

          {/* Add Extra Member Button */}
          {onOpenAddUser && (
            <button
              type="button"
              onClick={onOpenAddUser}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-bold transition flex-shrink-0 shadow-sm"
              title="Add a custom member to the team"
            >
              <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
              <span>+ Add Member</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
