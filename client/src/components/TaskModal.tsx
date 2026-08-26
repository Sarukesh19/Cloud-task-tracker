import React, { useState, useEffect } from 'react';
import { X, Calendar, AlertTriangle, UserCheck, ShieldAlert, Sparkles } from 'lucide-react';
import { Task, TaskPriority, TaskStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../context/TaskContext';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTask?: Task | null;
  defaultStatus?: TaskStatus;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  initialTask
}) => {
  const { user, users } = useAuth();
  const { createTask, updateTask, tasks } = useTasks();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title);
      setDescription(initialTask.description || '');
      setPriority(initialTask.priority);
      setAssigneeId(initialTask.assigneeId);
      try {
        const d = new Date(initialTask.dueDate);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        setDueDate(d.toISOString().slice(0, 16));
      } catch (e) {
        setDueDate('');
      }
    } else {
      setTitle('');
      setDescription('');
      setPriority('MEDIUM');
      setAssigneeId(user?.id || (users[0] ? users[0].id : ''));
      const defaultDue = new Date(Date.now() + 2 * 86400000);
      defaultDue.setHours(18, 0, 0, 0);
      defaultDue.setMinutes(defaultDue.getMinutes() - defaultDue.getTimezoneOffset());
      setDueDate(defaultDue.toISOString().slice(0, 16));
    }
    setErrorMessage(null);
  }, [initialTask, isOpen, user, users]);

  if (!isOpen) return null;

  // Calculate active task count for selected assignee (Constraint 3)
  const selectedAssigneeActiveCount = tasks.filter(
    t => t.assigneeId === assigneeId && 
         (t.status === 'PENDING' || t.status === 'IN_PROGRESS') &&
         (initialTask ? t.id !== initialTask.id : true)
  ).length;

  const isAssigneeFull = selectedAssigneeActiveCount >= 5;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Task title is required.');
      return;
    }
    if (!assigneeId) {
      setErrorMessage('Please select an assignee.');
      return;
    }
    if (!dueDate) {
      setErrorMessage('Due date is required.');
      return;
    }

    if (isAssigneeFull) {
      setErrorMessage(`Constraint 3 Violation: Assignee already holds ${selectedAssigneeActiveCount} active tasks (max 5 allowed).`);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const isoDueDate = new Date(dueDate).toISOString();

      if (initialTask) {
        await updateTask(initialTask.id, {
          title: title.trim(),
          description: description.trim(),
          priority,
          assigneeId,
          dueDate: isoDueDate
        });
      } else {
        await createTask({
          title: title.trim(),
          description: description.trim(),
          priority,
          assigneeId,
          dueDate: isoDueDate
        });
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                {initialTask ? 'Edit Task Details' : 'Create New Cloud Task'}
              </h2>
              <p className="text-xs text-slate-400">
                Enforces role permissions, 5-task limit, and real-time alerts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="m-6 mb-0 p-3.5 rounded-2xl bg-red-500/15 border border-red-500/40 text-xs text-red-300 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="block font-bold">Action Rejected by System:</strong>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Task Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Build authentication middleware"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Description & Requirements
            </label>
            <textarea
              rows={3}
              placeholder="Provide context, acceptance criteria, or links..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition resize-none"
            />
          </div>

          {/* Priority & Due Date (2-column) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Priority Level
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 outline-none transition"
              >
                <option value="LOW">🟢 Low Priority</option>
                <option value="MEDIUM">🔵 Medium Priority</option>
                <option value="HIGH">🟠 High Priority</option>
                <option value="URGENT">🔴 Urgent Priority</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Due Date & Time <span className="text-red-400">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 outline-none transition"
              />
            </div>
          </div>

          {/* Assignee with Capacity Indicator */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Assignee <span className="text-red-400">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                Active Cap: <strong>5 tasks max</strong>
              </span>
            </div>

            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 outline-none transition"
            >
              {users.map((u) => {
                const activeCount = tasks.filter(
                  t => t.assigneeId === u.id && 
                       (t.status === 'PENDING' || t.status === 'IN_PROGRESS') &&
                       (initialTask ? t.id !== initialTask.id : true)
                ).length;
                const isFull = activeCount >= 5;

                return (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role}) — {activeCount}/5 active {isFull ? '⚠️ [FULL]' : ''}
                  </option>
                );
              })}
            </select>

            {/* Warning if assignee is at max limit */}
            {isAssigneeFull && (
              <div className="mt-2 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-400" />
                <span>
                  <strong>Warning (Constraint 3):</strong> This member already holds 5 active tasks. You cannot assign more tasks until they complete or hand off one.
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isAssigneeFull}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition shadow-md ${
                isAssigneeFull
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-sky-500/20'
              }`}
            >
              {isSubmitting ? 'Saving...' : initialTask ? 'Update Task' : 'Create & Assign Task'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
