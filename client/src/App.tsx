import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { TaskProvider, useTasks } from './context/TaskContext';

// Components
import { LoginPage } from './components/LoginPage';
import { Navbar } from './components/Navbar';
import { UserSwitcherBar } from './components/UserSwitcherBar';
import { ConstraintRuleCards } from './components/ConstraintRuleCards';
import { KanbanBoard } from './components/KanbanBoard';
import { TaskListView } from './components/TaskListView';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { TaskModal } from './components/TaskModal';
import { TaskDetailDrawer } from './components/TaskDetailDrawer';
import { NotificationCenter } from './components/NotificationCenter';
import { QueueMonitorModal } from './components/QueueMonitorModal';
import { EmailInboxModal } from './components/EmailInboxModal';
import { AddUserModal } from './components/AddUserModal';
import { ToastContainer } from './components/ToastContainer';
import { Task, TaskStatus } from './types';

const MainAppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<'kanban' | 'list' | 'analytics'>('kanban');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultCreateStatus, setDefaultCreateStatus] = useState<TaskStatus>('PENDING');

  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [isQueueMonitorOpen, setIsQueueMonitorOpen] = useState<boolean>(false);
  const [isEmailInboxOpen, setIsEmailInboxOpen] = useState<boolean>(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState<boolean>(false);

  const { selectedTask, closeTaskDetail } = useTasks();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono">Initializing CloudTrack Session...</span>
        </div>
      </div>
    );
  }

  // If user is not logged in, show dedicated Login / Registration Page
  if (!user) {
    return (
      <>
        <LoginPage />
        <ToastContainer />
      </>
    );
  }

  const handleOpenCreateTask = (defaultStatus: TaskStatus = 'PENDING') => {
    setEditingTask(null);
    setDefaultCreateStatus(defaultStatus);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
    closeTaskDetail();
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-sky-500 selection:text-white">
      {/* Top Sticky Navigation */}
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        onOpenCreateTask={() => handleOpenCreateTask('PENDING')}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenQueueMonitor={() => setIsQueueMonitorOpen(true)}
        onOpenEmailInbox={() => setIsEmailInboxOpen(true)}
      />

      {/* Evaluator Fast Persona Switcher Bar with + Add Member button */}
      <UserSwitcherBar onOpenAddUser={() => setIsAddUserOpen(true)} />

      {/* Constraints & System Rulebook Banner */}
      <ConstraintRuleCards />

      {/* Main Content View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentView === 'kanban' && (
          <KanbanBoard onOpenCreateTask={handleOpenCreateTask} />
        )}
        {currentView === 'list' && (
          <TaskListView />
        )}
        {currentView === 'analytics' && (
          <AnalyticsDashboard />
        )}
      </main>

      {/* Floating Toast Alerts */}
      <ToastContainer />

      {/* Modals & Drawers */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        initialTask={editingTask}
        defaultStatus={defaultCreateStatus}
      />

      <TaskDetailDrawer
        task={selectedTask}
        onClose={closeTaskDetail}
        onEdit={handleEditTask}
      />

      <NotificationCenter
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      <QueueMonitorModal
        isOpen={isQueueMonitorOpen}
        onClose={() => setIsQueueMonitorOpen(false)}
      />

      <EmailInboxModal
        isOpen={isEmailInboxOpen}
        onClose={() => setIsEmailInboxOpen(false)}
      />

      <AddUserModal
        isOpen={isAddUserOpen}
        onClose={() => setIsAddUserOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <TaskProvider>
          <MainAppContent />
        </TaskProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
