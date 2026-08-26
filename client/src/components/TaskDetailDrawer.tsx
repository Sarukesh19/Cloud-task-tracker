import React from 'react';
import { 
  X, 
  Clock, 
  Calendar, 
  User as UserIcon, 
  History, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  Edit3, 
  Trash2, 
  ShieldCheck, 
  Lock
} from 'lucide-react';
import { Task, TaskPriority, TaskStatus, TaskAuditLog } from '../types';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../context/TaskContext';

interface TaskDetailDrawerProps {
  task: Task | null;
  onClose: () => void;
  onEdit: (task: Task) => void;
}

export const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({
  task,
  onClose,
  onEdit
}) => {
  const { user, isAdmin } = useAuth();
  const { updateTaskStatus, deleteTask } = useTasks();

  if (!task) return null;

  const isAssignee = user?.id === task.assigneeId;
  const canComplete = isAssignee || isAdmin;
  const isCompleted = task.status === 'COMPLETED';
  const showOverdue = task.isOverdue && !isCompleted;
  const auditLogs = task.auditHistory || [];

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'MEDIUM':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
      case 'LOW':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    }
  };

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'IN_PROGRESS':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
      case 'COMPLETED':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    }
  };

  const getActionBadge = (action: TaskAuditLog['action']) => {
    switch (action) {
      case 'CREATED':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'STATUS_CHANGE':
        return 'bg-sky-500/20 text-sky-400 border-sky-500/30';
      case 'REASSIGNED':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'OVERDUE_FLAGGED':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-hidden bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div 
          className="w-screen max-w-xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-800 flex items-start justify-between bg-slate-950/40">
            <div className="space-y-2 pr-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${getPriorityBadge(task.priority)}`}>
                  {task.priority} Priority
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${getStatusBadge(task.status)}`}>
                  {task.status.replace('_', ' ')}
                </span>
                {showOverdue && (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-500 text-white animate-pulse">
                    <AlertCircle className="w-3 h-3" />
                    <span>OVERDUE</span>
                  </span>
                )}
              </div>
              <h2 className="text-lg font-extrabold text-slate-100 leading-snug">
                {task.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition flex-shrink-0"
              title="Close Drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Description */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Description
              </h4>
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 text-sm text-slate-200 leading-relaxed">
                {task.description || <span className="italic text-slate-500">No description provided.</span>}
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-3.5">
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                  <UserIcon className="w-3.5 h-3.5 text-sky-400" />
                  <span>Assignee</span>
                </div>
                <div className="text-sm font-bold text-slate-200">
                  {task.assigneeName}
                </div>
              </div>

              <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-3.5">
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>Due Date</span>
                </div>
                <div className="text-sm font-bold text-slate-200">
                  {new Date(task.dueDate).toLocaleString(undefined, { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric',
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>

              <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-3.5">
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                  <span>Created By</span>
                </div>
                <div className="text-xs font-semibold text-slate-200">
                  {task.creatorName}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {new Date(task.createdAt).toLocaleDateString()}
                </div>
              </div>

              <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-3.5">
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Your Permission</span>
                </div>
                <div className="text-xs font-semibold text-slate-200">
                  {canComplete ? 'Can Mark Completed' : 'View / Start Only'}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {isAdmin ? 'Admin Rights' : isAssignee ? 'Assigned to you' : 'Other Member'}
                </div>
              </div>
            </div>

            {/* Lifecycle Transition Actions */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                Lifecycle State Actions (Constraints 1 & 2)
              </h4>
              <div className="flex flex-wrap items-center gap-3">
                {task.status === 'PENDING' && (
                  <button
                    onClick={() => updateTaskStatus(task.id, 'IN_PROGRESS')}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition shadow-lg shadow-sky-600/30"
                  >
                    <span>Move to In Progress</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                {task.status === 'IN_PROGRESS' && (
                  <button
                    onClick={() => updateTaskStatus(task.id, 'COMPLETED')}
                    disabled={!canComplete}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition shadow-lg ${
                      canComplete
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    }`}
                  >
                    {!canComplete && <Lock className="w-3 h-3" />}
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Mark Task Completed</span>
                  </button>
                )}

                {task.status === 'COMPLETED' && (
                  <div className="flex-1 py-2 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Task is Finished & Verified</span>
                  </div>
                )}
              </div>

              {task.status === 'IN_PROGRESS' && !canComplete && (
                <p className="text-[11px] text-amber-400/90 mt-2">
                  🔒 <strong>Constraint 2:</strong> Only <em>{task.assigneeName}</em> (the assignee) or an <em>Admin</em> may complete this task. Switch persona in top bar to test!
                </p>
              )}
            </div>

            {/* Constraint 6: Auditable History Timeline */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-4 h-4 text-purple-400" />
                  <span>Auditable History (Retaining ≥3 Entries)</span>
                </h4>
                <span className="text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded-full font-mono">
                  {auditLogs.length} Records
                </span>
              </div>

              <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-800">
                {auditLogs.length === 0 ? (
                  <p className="text-xs text-slate-500 italic pl-8">No history logged yet.</p>
                ) : (
                  auditLogs.map((log) => (
                    <div key={log.id} className="relative flex items-start gap-3 pl-8">
                      {/* Timeline Dot */}
                      <div className="absolute left-2 top-1.5 w-3.5 h-3.5 rounded-full bg-slate-900 border-2 border-purple-400 z-10" />

                      {/* Log Box */}
                      <div className="flex-1 bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3 shadow-sm">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className={`text-[9px] font-bold px-2 py-0.2 rounded border uppercase tracking-wider ${getActionBadge(log.action)}`}>
                            {log.action.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>

                        <p className="text-xs text-slate-200 font-medium">
                          {log.details || `${log.userName} performed ${log.action}`}
                        </p>

                        {log.fieldChanged && (
                          <div className="mt-1 text-[11px] font-mono text-slate-400 flex items-center gap-1">
                            <span>{log.fieldChanged}:</span>
                            <span className="text-red-400 line-through">{log.oldValue || 'null'}</span>
                            <span>➔</span>
                            <span className="text-emerald-400 font-bold">{log.newValue}</span>
                          </div>
                        )}

                        <div className="mt-1.5 text-[10px] text-slate-500 flex items-center gap-1">
                          <span>Actor:</span>
                          <strong className="text-slate-400">{log.userName}</strong>
                          <span>({log.userRole})</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
            <button
              onClick={() => {
                if (confirm(`Delete "${task.title}"?`)) {
                  deleteTask(task.id);
                  onClose();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 text-xs font-semibold transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Task</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onEdit(task)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Details</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
