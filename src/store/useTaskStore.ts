import { create } from 'zustand';
import { Task, TaskExecutionLog, FailReason, TaskDifficulty } from '../types/database.types';

interface TaskState {
  tasks: Task[];
  logs: TaskExecutionLog[];
  addTask: (task: Omit<Task, 'id' | 'user_id' | 'created_at' | 'status' | 'xp_reward'>) => void;
  completeTask: (taskId: string) => void;
  failTask: (taskId: string, reason: FailReason, notes?: string) => void;
  postponeTask: (taskId: string, newDate: string) => void;
}

const getXpReward = (difficulty: TaskDifficulty) => {
  switch (difficulty) {
    case 'easy': return 10;
    case 'medium': return 25;
    case 'hard': return 50;
    default: return 10;
  }
};

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  logs: [],
  
  addTask: (taskData) => set((state) => {
    const newTask: Task = {
      ...taskData,
      id: crypto.randomUUID(),
      user_id: 'local-user', // Mock user for now
      status: 'planned',
      xp_reward: getXpReward(taskData.difficulty),
      created_at: new Date().toISOString(),
    };
    return { tasks: [newTask, ...state.tasks] };
  }),

  completeTask: (taskId) => set((state) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return state;

    const newLog: TaskExecutionLog = {
      id: crypto.randomUUID(),
      task_id: taskId,
      user_id: task.user_id,
      action: 'completed',
      fail_reason: null,
      notes: null,
      original_date: task.scheduled_date,
      new_date: null,
      logged_at: new Date().toISOString(),
    };

    return {
      tasks: state.tasks.map(t => t.id === taskId ? { ...t, status: 'completed' } : t),
      logs: [newLog, ...state.logs]
    };
  }),

  failTask: (taskId, reason, notes) => set((state) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return state;

    const newLog: TaskExecutionLog = {
      id: crypto.randomUUID(),
      task_id: taskId,
      user_id: task.user_id,
      action: 'failed',
      fail_reason: reason,
      notes: notes || null,
      original_date: task.scheduled_date,
      new_date: null,
      logged_at: new Date().toISOString(),
    };

    return {
      tasks: state.tasks.map(t => t.id === taskId ? { ...t, status: 'failed' } : t),
      logs: [newLog, ...state.logs]
    };
  }),

  postponeTask: (taskId, newDate) => set((state) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return state;

    const newLog: TaskExecutionLog = {
      id: crypto.randomUUID(),
      task_id: taskId,
      user_id: task.user_id,
      action: 'postponed',
      fail_reason: null,
      notes: 'Adiado pelo usuário',
      original_date: task.scheduled_date,
      new_date: newDate,
      logged_at: new Date().toISOString(),
    };

    return {
      tasks: state.tasks.map(t => t.id === taskId ? { ...t, scheduled_date: newDate } : t),
      logs: [newLog, ...state.logs]
    };
  })
}));
