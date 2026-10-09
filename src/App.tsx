import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { Navbar } from './components/Navbar';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { TasksPage } from './pages/TasksPage';
import { ProfilePage } from './pages/ProfilePage';
import { TaskFormModal } from './components/TaskFormModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { ActivePage, Task, TaskPriority, TaskStatus } from './types';
import { api } from './services/api';
import { Loader2 } from 'lucide-react';

function MainApp() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { success, error: toastError } = useToast();

  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [currentPage, setCurrentPage] = useState<ActivePage>('dashboard');
  const [taskFilterStatus, setTaskFilterStatus] = useState<string>('all');

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Key to force refresh lists after mutations
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 mb-4 animate-pulse">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <p className="text-sm font-semibold text-slate-700">Connecting to TaskFlow...</p>
      </div>
    );
  }

  // Unauthenticated Flow
  if (!isAuthenticated || !user) {
    return (
      <>
        {authView === 'login' ? (
          <LoginPage onNavigateToRegister={() => setAuthView('register')} />
        ) : (
          <RegisterPage onNavigateToLogin={() => setAuthView('login')} />
        )}
      </>
    );
  }

  // Handlers for Task CRUD
  const handleOpenCreateTask = () => {
    setEditingTask(null);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleTaskSubmit = async (data: {
    title: string;
    description?: string;
    status: TaskStatus;
    priority: TaskPriority;
    due_date?: string | null;
  }) => {
    try {
      if (editingTask) {
        await api.updateTask(editingTask.id, data);
        success('Task updated successfully.');
      } else {
        await api.createTask(data);
        success('Task created successfully.');
      }
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Operation failed');
      throw err;
    }
  };

  const handleDeletePrompt = (task: Task) => {
    setDeletingTask(task);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingTask) return;
    setIsDeleting(true);
    try {
      await api.deleteTask(deletingTask.id);
      success('Task deleted successfully.');
      setIsDeleteModalOpen(false);
      setDeletingTask(null);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Failed to delete task');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleNavigateToTasksWithFilter = (filterStatus: string = 'all') => {
    setTaskFilterStatus(filterStatus);
    setCurrentPage('tasks');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* Top Navbar */}
      <Navbar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onOpenCreateTask={handleOpenCreateTask}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentPage === 'dashboard' && (
          <DashboardPage
            key={refreshTrigger}
            onNavigateToTasks={handleNavigateToTasksWithFilter}
            onOpenCreateTask={handleOpenCreateTask}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeletePrompt}
          />
        )}

        {currentPage === 'tasks' && (
          <TasksPage
            key={refreshTrigger}
            initialStatusFilter={taskFilterStatus}
            onOpenCreateTask={handleOpenCreateTask}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeletePrompt}
          />
        )}

        {currentPage === 'profile' && <ProfilePage />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-700">TaskFlow SaaS</span>
            <span>•</span>
            <span>Modern Task Management Application</span>
          </div>

          <div className="flex items-center space-x-2 text-slate-400">
            <span>FastAPI & PostgreSQL Backend</span>
          </div>
        </div>
      </footer>

      {/* Task Create / Edit Modal */}
      <TaskFormModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSubmit={handleTaskSubmit}
        initialTask={editingTask}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        task={deletingTask}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingTask(null);
        }}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ToastProvider>
  );
}
