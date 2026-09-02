export type UserProfile = {
  id: string;
  username: string | null;
  level: number;
  xp_total: number;
  xp_current: number;
  created_at: string;
};

export type TaskStatus = 'planned' | 'in_progress' | 'completed' | 'failed' | 'postponed' | 'canceled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskDifficulty = 'easy' | 'medium' | 'hard';
export type FailReason = 'lack_of_time' | 'tiredness' | 'forgot' | 'lack_of_motivation' | 'unexpected_event' | 'priority_changed' | 'procrastination' | 'external_problem' | 'no_longer_necessary' | 'other';

export type Task = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  duration_estimated: number | null; // minutes
  priority: TaskPriority;
  difficulty: TaskDifficulty;
  status: TaskStatus;
  category_id: string | null;
  xp_reward: number;
  created_at: string;
};

export type HabitFrequency = 'daily' | 'weekdays' | 'weekly';

export type Habit = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  frequency: HabitFrequency;
  xp_reward: number;
  current_streak: number;
  created_at: string;
};

export type HabitLog = {
  id: string;
  habit_id: string;
  user_id: string;
  completed_at: string;
};

export type TaskExecutionLog = {
  id: string;
  task_id: string;
  user_id: string;
  action: 'completed' | 'failed' | 'postponed';
  fail_reason: FailReason | null;
  notes: string | null;
  original_date: string | null;
  new_date: string | null;
  logged_at: string;
};
