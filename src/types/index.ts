export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface User {
  id: number;
  email: string;
  full_name: string;
  created_at: string;
  updated_at?: string;
}

export interface Task {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  overdue: number;
  completion_rate: number;
}

export interface TaskFilterParams {
  search?: string;
  status?: string;
  priority?: string;
  sort_by?: 'created_at' | 'due_date' | 'priority' | 'title';
  sort_order?: 'asc' | 'desc';
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export type ActivePage = 'dashboard' | 'tasks' | 'create-task' | 'profile';
