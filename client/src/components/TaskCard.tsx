import React from 'react';
import { 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  History, 
  MoreVertical, 
  Trash2, 
  Edit3,
  Calendar,
  Lock
} from 'lucide-react';
import { Task, TaskPriority } from '../types';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../context/TaskContext';

interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit }) => {
  const { user, isAdmin } = useAuth();
  const { updateTaskStatus, deleteTask, openTaskDetail } = useTasks();

  const isAssignee = user?.id === task.assigneeId;
  const canComplete = isAssignee || isAdmin;
  const auditCount = task.auditHistory?.length || 0;

  // Due date & Overdue formatting
  const dueDateObj = new Date(task.dueDate);
  const nowObj = new Date();
  const isPast = dueDateObj < nowObj;
  const isCompleted = task.status === 'COMPLETED';
  const showOverdue = task.isOverdue && !isCompleted;

  // Format relative due date
  const formatDue = () => {
    const diffMs = dueDateObj.getTime() - nowObj.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.round(diffHours / 24);

    if (showOverdue) {
      if (Math.abs(diffHours) < 24) {
        return `Overdue by ${Math.abs(diffHours)}h`;
      }
      return `Overdue by ${Math.abs(diffDays)}d`;
    }

    if (diffHours < 0) return 'Due today';
    if (diffHours < 24) return `Due in ${diffHours}h`;
    if (diffDays === 1) return 'Due tomorrow';
    return `Due in ${diffDays}d`;
  };

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

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ taskId: task.id, status: task.status }));
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={() => openTaskDetail(task)}
      className={`group relative rounded-2xl p-4 transition-all duration-200 cursor-pointer ${
        showOverdue
          ? 'bg-slate-900/90 border border-red-500/80 overdue-glow'
          : 'bg-slate-900/70 hover:bg-slate-900/90 border border-slate-800 hover:border-slate-700 hover:shadow-xl hover:shadow-sky-950/20 hover:-translate-y-0.5'
      }`}
    >
      {/* Top Header: Priority + Overdue Badge + History Count */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getPriorityBadge(
              task.priority
            )}`}
          >
            {task.priority}
          </span>

          {showOverdue && (
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white shadow-sm shadow-red-500/50 animate-pulse">
              <AlertCircle className="w-3 h-3" />
              <span>{formatDue()}</span>
            </span>
          )}
        </div>

        {/* Audit Log Counter */}
        <div
          className="flex items-center gap-1 text-[11px] text-slate-500 group-hover:text-slate-400 font-mono transition"
          title={`Auditable history: ${auditCount} recorded changes`}
        >
          <History className="w-3 h-3" />
          <span>{auditCount}</span>
        </div>
      </div>

      {/* Task Title */}
      <h3 className="text-sm font-bold text-slate-100 group-hover:text-sky-300 transition-colors line-clamp-2 leading-snug">
        {task.title}
      </h3>

      {/* Task Description */}
      {task.description && (
        <p className="text-xs text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Due Date Indicator */}
      {!showOverdue && (
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-3 font-medium">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <span>{new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          <span className="text-[10px] text-slate-500">({formatDue()})</span>
        </div>
      )}

      {/* Footer: Assignee & Action Transition Button */}
      <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
        {/* Assignee Avatar + Name */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-sky-400 overflow-hidden flex-shrink-0">
            {task.assigneeName.charAt(0)}
          </div>
          <span className="text-xs text-slate-300 font-medium truncate">
            {task.assigneeName}
          </span>
        </div>

        {/* Quick Transition Action Button */}
        <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {task.status === 'PENDING' && (
            <button
              onClick={() => updateTaskStatus(task.id, 'IN_PROGRESS')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-600/20 hover:bg-sky-600 text-sky-300 hover:text-white text-xs font-semibold border border-sky-500/30 transition shadow-sm"
              title="Constraint 1: Move from Pending to In Progress"
            >
              <span>Start</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}

          {task.status === 'IN_PROGRESS' && (
            <button
              onClick={() => updateTaskStatus(task.id, 'COMPLETED')}
              disabled={!canComplete}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition shadow-sm ${
                canComplete
                  ? 'bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
              }`}
              title={
                canComplete
                  ? 'Constraint 2: Mark task Completed'
                  : `Constraint 2: Only assignee (${task.assigneeName}) or Admin can complete`
              }
            >
              {!canComplete && <Lock className="w-3 h-3" />}
              <CheckCircle2 className="w-3 h-3" />
              <span>Complete</span>
            </button>
          )}

          {task.status === 'COMPLETED' && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-[11px] font-semibold border border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3" />
              <span>Done</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
