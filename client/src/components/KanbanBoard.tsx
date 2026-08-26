import React, { useState } from 'react';
import { TaskStatus, Task } from '../types';
import { useTasks } from '../context/TaskContext';
import { useAuth } from '../context/AuthContext';
import { TaskCard } from './TaskCard';
import { 
  Clock, 
  PlayCircle, 
  CheckCircle, 
  Plus, 
  AlertTriangle,
  Filter,
  Users,
  Flag
} from 'lucide-react';

interface KanbanBoardProps {
  onOpenCreateTask: (defaultStatus?: TaskStatus) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ onOpenCreateTask }) => {
  const { 
    filteredTasks, 
    updateTaskStatus, 
    statusFilter, 
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    assigneeFilter,
    setAssigneeFilter,
    showOverdueOnly,
    setShowOverdueOnly
  } = useTasks();
  const { users, user } = useAuth();
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  const columns: { id: TaskStatus; title: string; desc: string; icon: any; color: string; border: string }[] = [
    {
      id: 'PENDING',
      title: 'Pending',
      desc: 'Waiting to be picked up',
      icon: Clock,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      border: 'border-amber-500/30'
    },
    {
      id: 'IN_PROGRESS',
      title: 'In Progress',
      desc: 'Currently being worked on',
      icon: PlayCircle,
      color: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
      border: 'border-sky-500/30'
    },
    {
      id: 'COMPLETED',
      title: 'Completed',
      desc: 'Verified & finished',
      icon: CheckCircle,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      border: 'border-emerald-500/30'
    }
  ];

  const handleDragOver = (e: React.DragEvent, colId: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(colId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (!dataStr) return;
      const { taskId, status: currentStatus } = JSON.parse(dataStr);
      if (currentStatus === targetStatus) return;

      await updateTaskStatus(taskId, targetStatus);
    } catch (err) {
      // toast is handled in updateTaskStatus
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-slate-400 font-semibold flex items-center gap-1.5 pl-1">
            <Filter className="w-3.5 h-3.5 text-sky-400" /> Filters:
          </span>

          {/* Status Quick Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-sky-500 transition"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Only</option>
            <option value="IN_PROGRESS">In Progress Only</option>
            <option value="COMPLETED">Completed Only</option>
            <option value="OVERDUE">🚨 Overdue Only</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-sky-500 transition"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent Priority</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
          </select>

          {/* Assignee Filter */}
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-sky-500 transition"
          >
            <option value="ALL">All Assignees</option>
            <option value="MY_TASKS">👤 Assigned to Me</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
            ))}
          </select>

          {/* Overdue Checkbox Toggle */}
          <button
            onClick={() => setShowOverdueOnly(!showOverdueOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
              showOverdueOnly
                ? 'bg-red-500/20 text-red-300 border-red-500/60 shadow-sm shadow-red-500/20'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-300'
            }`}
          >
            <span>🚨 Overdue Only</span>
          </button>
        </div>

        {/* Total Tasks Count */}
        <div className="text-xs text-slate-400 pr-2">
          Showing <strong className="text-sky-400">{filteredTasks.length}</strong> tasks
        </div>
      </div>

      {/* Kanban 3-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
        {columns.map((col) => {
          const colTasks = filteredTasks.filter(t => t.status === col.id);
          const Icon = col.icon;
          const isOver = dragOverColumn === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`rounded-3xl p-4 transition-all duration-200 border min-h-[550px] flex flex-col ${
                isOver
                  ? 'bg-sky-500/10 border-sky-500/80 shadow-lg shadow-sky-500/10'
                  : 'bg-slate-900/40 border-slate-800/80'
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-xl border ${col.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <span>{col.title}</span>
                      <span className="text-xs px-2 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono font-bold">
                        {colTasks.length}
                      </span>
                    </h2>
                    <p className="text-[11px] text-slate-500">{col.desc}</p>
                  </div>
                </div>

                {col.id === 'PENDING' && (
                  <button
                    onClick={() => onOpenCreateTask('PENDING')}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    title="Add task to Pending"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Tasks List */}
              <div className="space-y-3 flex-1">
                {colTasks.length === 0 ? (
                  <div className="h-40 rounded-2xl border border-dashed border-slate-800 flex flex-col items-center justify-center p-4 text-center">
                    <p className="text-xs text-slate-500 font-medium">No tasks in {col.title}</p>
                    <p className="text-[11px] text-slate-600 mt-1">
                      {col.id === 'PENDING'
                        ? 'Create a new task to get started'
                        : 'Drag cards here to update state'}
                    </p>
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
