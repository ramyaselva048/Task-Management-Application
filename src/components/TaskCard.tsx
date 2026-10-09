import React, { useState } from 'react';
import { Task, TaskPriority, TaskStatus } from '../types';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  Edit3,
  Trash2,
  Check,
} from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onToggleComplete: (task: Task) => Promise<void>;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onEdit,
  onDelete,
  onToggleComplete,
}) => {
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsToggling(true);
    try {
      await onToggleComplete(task);
    } finally {
      setIsToggling(false);
    }
  };

  const isCompleted = task.status === 'completed';

  // Check if overdue
  const isOverdue = React.useMemo(() => {
    if (isCompleted || !task.due_date) return false;
    const dueTime = new Date(task.due_date).getTime();
    return dueTime < Date.now();
  }, [task.due_date, isCompleted]);

  // Priority metadata
  const priorityBadgeConfig = {
    high: {
      label: 'High',
      bg: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: <ArrowUp className="w-3 h-3 text-rose-600 stroke-[2.5]" />,
    },
    medium: {
      label: 'Medium',
      bg: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: <ArrowRight className="w-3 h-3 text-amber-600 stroke-[2.5]" />,
    },
    low: {
      label: 'Low',
      bg: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: <ArrowDown className="w-3 h-3 text-slate-500 stroke-[2.5]" />,
    },
  }[task.priority] || {
    label: task.priority,
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: null,
  };

  // Status metadata
  const statusBadgeConfig = {
    pending: {
      label: 'Pending',
      bg: 'bg-slate-100 text-slate-700 border-slate-200',
    },
    in_progress: {
      label: 'In Progress',
      bg: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    completed: {
      label: 'Completed',
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
  }[task.status];

  // Format due date nicely
  const formattedDueDate = task.due_date
    ? new Date(task.due_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year:
          new Date(task.due_date).getFullYear() !== new Date().getFullYear()
            ? 'numeric'
            : undefined,
      })
    : null;

  return (
    <div
      className={`group relative bg-white rounded-xl border p-5 transition-all duration-200 hover:shadow-md ${
        isCompleted
          ? 'border-slate-200 bg-slate-50/50'
          : isOverdue
          ? 'border-rose-200 hover:border-rose-300'
          : 'border-slate-200/80 hover:border-blue-300'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Toggle Checkbox & Title */}
        <div className="flex items-start space-x-3.5 flex-1 min-w-0">
          <button
            type="button"
            onClick={handleToggle}
            disabled={isToggling}
            aria-label={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
            className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 ${
              isCompleted
                ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                : 'border-slate-300 hover:border-blue-500 bg-white hover:bg-blue-50'
            } ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
          </button>

          <div className="flex-1 min-w-0">
            <h3
              className={`text-base font-semibold text-slate-900 tracking-tight leading-snug break-words ${
                isCompleted ? 'line-through text-slate-400' : ''
              }`}
            >
              {task.title}
            </h3>

            {task.description && (
              <p
                className={`mt-1.5 text-sm text-slate-600 leading-relaxed line-clamp-2 break-words ${
                  isCompleted ? 'text-slate-400' : ''
                }`}
              >
                {task.description}
              </p>
            )}
          </div>
        </div>

        {/* Quick Action Buttons (Edit / Delete) */}
        <div className="flex items-center space-x-1 shrink-0 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(task)}
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit task"
            aria-label="Edit task"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(task)}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            title="Delete task"
            aria-label="Delete task"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Meta Footer (Badges, Due Date) */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Priority Pill */}
          <span
            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-md font-medium border ${priorityBadgeConfig.bg}`}
          >
            {priorityBadgeConfig.icon}
            <span>{priorityBadgeConfig.label}</span>
          </span>

          {/* Status Pill */}
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-md font-medium border ${statusBadgeConfig.bg}`}
          >
            {statusBadgeConfig.label}
          </span>
        </div>

        {/* Due Date Indicator */}
        {formattedDueDate && (
          <div
            className={`inline-flex items-center space-x-1.5 font-medium ${
              isCompleted
                ? 'text-slate-400'
                : isOverdue
                ? 'text-rose-600 font-semibold'
                : 'text-slate-500'
            }`}
          >
            {isOverdue && !isCompleted ? (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            ) : (
              <Calendar className="w-3.5 h-3.5" />
            )}
            <span>
              {isOverdue && !isCompleted ? `Overdue (${formattedDueDate})` : formattedDueDate}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
