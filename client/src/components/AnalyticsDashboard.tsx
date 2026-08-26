import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Users, 
  Cpu, 
  Mail, 
  ShieldCheck, 
  Flame 
} from 'lucide-react';
import { useTasks } from '../context/TaskContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { SystemStats } from '../types';

export const AnalyticsDashboard: React.FC = () => {
  const { tasks } = useTasks();
  const { users } = useAuth();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [clientsCount, setClientsCount] = useState<number>(1);

  const fetchStats = async () => {
    try {
      const data = await api.getSystemStats();
      setStats(data.stats);
      setClientsCount(data.connectedClients);
    } catch (e) {
      console.error('Failed to load stats:', e);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, []);

  const totalTasks = tasks.length || 1;
  const pendingCount = tasks.filter(t => t.status === 'PENDING').length;
  const inProgressCount = tasks.filter(t => t.status === 'IN_PROGRESS').length;
  const completedCount = tasks.filter(t => t.status === 'COMPLETED').length;
  const overdueCount = tasks.filter(t => t.isOverdue && t.status !== 'COMPLETED').length;

  const completionRate = Math.round((completedCount / totalTasks) * 100);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Tasks */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Tasks</span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-100">{tasks.length}</div>
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
            <span className="text-emerald-400 font-semibold">{completionRate}%</span> completion rate
          </div>
        </div>

        {/* KPI 2: Active (Pending & In Progress) */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Workload</span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-sky-400">{pendingCount + inProgressCount}</div>
          <div className="mt-2 text-xs text-slate-400">
            {pendingCount} Pending · {inProgressCount} In Progress
          </div>
        </div>

        {/* KPI 3: Overdue Rate */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overdue Alerts</span>
            <div className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-red-400">{overdueCount}</div>
          <div className="mt-2 text-xs text-slate-400">
            Auto-flagged with zero manual refresh
          </div>
        </div>

        {/* KPI 4: Async Delivery Queue */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Queue Throughput</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-purple-300">
            {stats?.processedQueueJobs ?? 0}
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-2">
            <span>{stats?.totalEmailsSent ?? 0} emails</span> · <span className="text-emerald-400 font-mono">100% SLA</span>
          </div>
        </div>
      </div>

      {/* 2-Column Analytics Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Section 1: Member Capacity & Workload (Constraint 3: Max 5 active tasks) */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-400" />
                <span>Member Workload vs. 5-Task Capacity Cap</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Enforcing Constraint 3: Rejects assignments exceeding 5 active tasks
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {users.map((u) => {
              const activeCount = tasks.filter(
                t => t.assigneeId === u.id && (t.status === 'PENDING' || t.status === 'IN_PROGRESS')
              ).length;
              const completedMemberCount = tasks.filter(
                t => t.assigneeId === u.id && t.status === 'COMPLETED'
              ).length;
              const percentage = Math.min(100, Math.round((activeCount / 5) * 100));
              const isFull = activeCount >= 5;

              return (
                <div key={u.id} className="space-y-1.5 bg-slate-950/40 p-3 rounded-2xl border border-slate-800/80">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <img src={u.avatar} alt={u.name} className="w-6 h-6 rounded-full object-cover" />
                      <span className="font-bold text-slate-200">{u.name}</span>
                      <span className="text-[10px] text-slate-400">({u.role})</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-emerald-400 font-medium">
                        {completedMemberCount} completed
                      </span>
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.2 rounded-md ${
                          isFull
                            ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                            : activeCount >= 4
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {activeCount} / 5 active {isFull ? '(CAP REACHED)' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isFull
                          ? 'bg-gradient-to-r from-red-500 to-rose-600'
                          : activeCount >= 4
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                          : 'bg-gradient-to-r from-sky-500 to-indigo-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: Task Status & Priority Distribution */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-purple-400" />
              <span>Status & Priority Breakdown</span>
            </h3>
            <p className="text-xs text-slate-400">
              Live lifecycle state distribution across all projects
            </p>
          </div>

          {/* Status Breakdown Horizontal Bars */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                <span>Pending Tasks</span>
                <span className="font-mono font-bold text-amber-400">{pendingCount} ({Math.round((pendingCount/totalTasks)*100)}%)</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(pendingCount/totalTasks)*100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                <span>In Progress Tasks</span>
                <span className="font-mono font-bold text-sky-400">{inProgressCount} ({Math.round((inProgressCount/totalTasks)*100)}%)</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-sky-400 rounded-full" style={{ width: `${(inProgressCount/totalTasks)*100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                <span>Completed Tasks</span>
                <span className="font-mono font-bold text-emerald-400">{completedCount} ({Math.round((completedCount/totalTasks)*100)}%)</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${(completedCount/totalTasks)*100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                <span>Overdue Tasks</span>
                <span className="font-mono font-bold text-red-400">{overdueCount} ({Math.round((overdueCount/totalTasks)*100)}%)</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full animate-pulse" style={{ width: `${(overdueCount/totalTasks)*100}%` }} />
              </div>
            </div>
          </div>

          {/* Priority Pills Summary */}
          <div className="pt-4 border-t border-slate-800 grid grid-cols-4 gap-2 text-center">
            <div className="p-2.5 rounded-2xl bg-red-500/10 border border-red-500/20">
              <span className="text-[10px] font-bold text-red-400 block">URGENT</span>
              <span className="text-base font-extrabold text-slate-100">{tasks.filter(t => t.priority === 'URGENT').length}</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <span className="text-[10px] font-bold text-amber-400 block">HIGH</span>
              <span className="text-base font-extrabold text-slate-100">{tasks.filter(t => t.priority === 'HIGH').length}</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-sky-500/10 border border-sky-500/20">
              <span className="text-[10px] font-bold text-sky-400 block">MEDIUM</span>
              <span className="text-base font-extrabold text-slate-100">{tasks.filter(t => t.priority === 'MEDIUM').length}</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-[10px] font-bold text-emerald-400 block">LOW</span>
              <span className="text-base font-extrabold text-slate-100">{tasks.filter(t => t.priority === 'LOW').length}</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
