import React, { useState } from 'react';
import { Task, TaskPriority, TaskStatus } from '../types';
import { useTasks } from '../context/TaskContext';
import { useAuth } from '../context/AuthContext';
import { 
  Calendar, 
  Clock, 
  History, 
  ArrowUpDown, 
  AlertCircle, 
  CheckCircle2, 
  Lock, 
  Trash2,
  ExternalLink
} from 'lucide-react';

export const TaskListView: React.FC = () => {
  const { filteredTasks, updateTaskStatus, deleteTask, openTaskDetail } = useTasks();
  const { user, isAdmin } = useAuth();
  const [sortField, setSortField] = useState<'title' | 'dueDate' | 'priority' | 'status'>('dueDate');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const handleSort = (field: 'title' | 'dueDate' | 'priority' | 'status') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const priorityWeights: Record<TaskPriority, number> = {
    URGENT: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1
  };

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    let result = 0;
    if (sortField === 'title') {
      result = a.title.localeCompare(b.title);
    } else if (sortField === 'dueDate') {
      result = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    } else if (sortField === 'priority') {
      result = priorityWeights[b.priority] - priorityWeights[a.priority];
    } else if (sortField === 'status') {
      result = a.status.localeCompare(b.status);
    }
    return sortAsc ? result : -result;
  });

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
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'IN_PROGRESS':
        return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
      case 'COMPLETED':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-semibold">
              <th 
                className="py-3.5 px-4 cursor-pointer hover:text-slate-200 transition"
                onClick={() => handleSort('title')}
              >
                <div className="flex items-center gap-1.5">
                  <span>Task Name</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>
              <th 
                className="py-3.5 px-4 cursor-pointer hover:text-slate-200 transition"
                onClick={() => handleSort('priority')}
              >
                <div className="flex items-center gap-1.5">
                  <span>Priority</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>
              <th 
                className="py-3.5 px-4 cursor-pointer hover:text-slate-200 transition"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center gap-1.5">
                  <span>Status & Lifecycle</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>
              <th className="py-3.5 px-4">Assignee</th>
              <th 
                className="py-3.5 px-4 cursor-pointer hover:text-slate-200 transition"
                onClick={() => handleSort('dueDate')}
              >
                <div className="flex items-center gap-1.5">
                  <span>Due Date</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>
              <th className="py-3.5 px-4">Audit Logs</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {sortedTasks.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  No tasks found matching current filters.
                </td>
              </tr>
            ) : (
              sortedTasks.map((task) => {
                const isCompleted = task.status === 'COMPLETED';
                const isOverdue = task.isOverdue && !isCompleted;
                const canComplete = user?.id === task.assigneeId || isAdmin;
                const auditCount = task.auditHistory?.length || 0;

                return (
                  <tr
                    key={task.id}
                    onClick={() => openTaskDetail(task)}
                    className={`group hover:bg-slate-800/40 transition cursor-pointer ${
                      isOverdue ? 'bg-red-500/5' : ''
                    }`}
                  >
                    {/* Title & Description */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-bold text-slate-100 group-hover:text-sky-300 transition-colors truncate">
                        {task.title}
                      </div>
                      {task.description && (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {task.description}
                        </p>
                      )}
                    </td>

                    {/* Priority Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${getPriorityBadge(task.priority)}`}>
                        {task.priority}
                      </span>
                    </td>

                    {/* Status with Inline Dropdown / State Action */}
                    <td className="py-3.5 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <select
                          value={task.status}
                          onChange={(e) => updateTaskStatus(task.id, e.target.value as TaskStatus)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-xl border outline-none cursor-pointer bg-slate-950 transition ${getStatusBadge(task.status)}`}
                        >
                          <option value="PENDING">Pending</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="COMPLETED">Completed</option>
                        </select>

                        {isOverdue && (
                          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">
                            <AlertCircle className="w-3 h-3" />
                            <span>Overdue</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Assignee */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-sky-400">
                          {task.assigneeName.charAt(0)}
                        </div>
                        <span className="text-slate-200 font-medium">{task.assigneeName}</span>
                      </div>
                    </td>

                    {/* Due Date */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>{new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>

                    {/* Audit History Counter */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-slate-400 font-mono">
                        <History className="w-3.5 h-3.5 text-slate-500" />
                        <span>{auditCount} records</span>
                      </div>
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openTaskDetail(task)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                          title="Open Details & Audit History"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete task "${task.title}"?`)) {
                              deleteTask(task.id);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition"
                          title="Delete task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
