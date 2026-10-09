import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { DashboardStats, Task } from '../types';
import {
  CheckCircle2,
  Clock,
  ListTodo,
  AlertTriangle,
  Flame,
  Plus,
  ArrowRight,
  TrendingUp,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { TaskCard } from '../components/TaskCard';

interface DashboardPageProps {
  onNavigateToTasks: (filterStatus?: string) => void;
  onOpenCreateTask: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigateToTasks,
  onOpenCreateTask,
  onEditTask,
  onDeleteTask,
}) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [statsData, tasksData] = await Promise.all([
        api.getDashboardStats(),
        api.getTasks({ sort_by: 'created_at', sort_order: 'desc' }),
      ]);
      setStats(statsData);
      setRecentTasks(tasksData);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleToggleComplete = async (task: Task) => {
    try {
      await api.toggleComplete(task.id);
      fetchDashboardData();
    } catch (err) {
      console.error(err);
    }
  };

  // Filter overdue and high priority tasks
  const overdueTasks = recentTasks.filter((t) => {
    if (t.status === 'completed' || !t.due_date) return false;
    return new Date(t.due_date).getTime() < Date.now();
  });

  const highPriorityTasks = recentTasks.filter(
    (t) => t.priority === 'high' && t.status !== 'completed'
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome & Action Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl shadow-slate-900/10">
        <div>
          <div className="flex items-center space-x-2 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Workspace Overview</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Hello, {user?.full_name?.split(' ')[0] || 'there'}!
          </h1>
          <p className="mt-1.5 text-sm text-slate-300 max-w-xl">
            You have {stats?.pending ?? 0} pending and {stats?.in_progress ?? 0} in-progress tasks.
            {stats && stats.overdue > 0
              ? ` Note that ${stats.overdue} task${stats.overdue > 1 ? 's are' : ' is'} currently overdue.`
              : ' Keep up the great pace!'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenCreateTask}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-sm shadow-md shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Total Tasks */}
        <div
          onClick={() => onNavigateToTasks('all')}
          className="cursor-pointer bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs hover:border-blue-400 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Tasks
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-bold text-slate-900">
            {stats?.total ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">All registered items</div>
        </div>

        {/* Pending */}
        <div
          onClick={() => onNavigateToTasks('pending')}
          className="cursor-pointer bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs hover:border-amber-400 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pending
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 group-hover:bg-amber-100 transition-colors">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-bold text-amber-600">
            {stats?.pending ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Not started yet</div>
        </div>

        {/* In Progress */}
        <div
          onClick={() => onNavigateToTasks('in_progress')}
          className="cursor-pointer bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs hover:border-blue-400 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              In Progress
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-bold text-blue-600">
            {stats?.in_progress ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Actively worked on</div>
        </div>

        {/* Completed */}
        <div
          onClick={() => onNavigateToTasks('completed')}
          className="cursor-pointer bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Completed
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100 transition-colors">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-bold text-emerald-600">
            {stats?.completed ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Finished tasks</div>
        </div>

        {/* Overdue */}
        <div
          onClick={() => onNavigateToTasks('all')}
          className="cursor-pointer bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs hover:border-rose-400 hover:shadow-md transition-all group col-span-2 lg:col-span-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Overdue
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 group-hover:bg-rose-100 transition-colors">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-bold text-rose-600">
            {stats?.overdue ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Passed deadline</div>
        </div>
      </div>

      {/* Completion Rate Progress Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-bold text-slate-900">Task Completion Rate</span>
            <span className="text-xs font-medium text-slate-500">
              ({stats?.completed ?? 0} of {stats?.total ?? 0} completed)
            </span>
          </div>
          <span className="text-sm font-bold text-blue-600">{stats?.completion_rate ?? 0}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-600 to-emerald-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${stats?.completion_rate ?? 0}%` }}
          />
        </div>
      </div>

      {/* Overdue Warning Section */}
      {overdueTasks.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-rose-900">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <h3 className="text-sm font-bold">Action Needed: {overdueTasks.length} Overdue Task(s)</h3>
            </div>
            <button
              onClick={() => onNavigateToTasks('all')}
              className="text-xs font-semibold text-rose-700 hover:underline flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {overdueTasks.slice(0, 4).map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
                onToggleComplete={handleToggleComplete}
              />
            ))}
          </div>
        </div>
      )}

      {/* High Priority Focus & Recent Tasks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Urgent High Priority List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-slate-900">
              <Flame className="w-4 h-4 text-rose-500" />
              <h3 className="text-sm font-bold uppercase tracking-wider">High Priority Focus</h3>
            </div>
            <span className="text-xs bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full">
              {highPriorityTasks.length}
            </span>
          </div>

          <div className="space-y-3">
            {highPriorityTasks.length === 0 ? (
              <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 bg-white text-slate-500 text-xs">
                No high priority tasks pending. Excellent work!
              </div>
            ) : (
              highPriorityTasks.slice(0, 3).map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={onEditTask}
                  onDelete={onDeleteTask}
                  onToggleComplete={handleToggleComplete}
                />
              ))
            )}
          </div>
        </div>

        {/* Recent Tasks List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-slate-900">
              <ListTodo className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Recent Tasks</h3>
            </div>
            <button
              onClick={() => onNavigateToTasks('all')}
              className="text-xs font-semibold text-blue-600 hover:underline flex items-center space-x-1"
            >
              <span>Manage All Tasks</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {recentTasks.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 bg-white text-slate-500 text-sm">
                <p>No tasks found in your workspace yet.</p>
                <button
                  onClick={onOpenCreateTask}
                  className="mt-3 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Create your first task
                </button>
              </div>
            ) : (
              recentTasks.slice(0, 5).map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={onEditTask}
                  onDelete={onDeleteTask}
                  onToggleComplete={handleToggleComplete}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
