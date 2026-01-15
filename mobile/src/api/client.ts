import { WorkoutSession, Goal } from '../../shared/types';

// Configure your API base URL
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  
  return response.json();
}

export const api = {
  // Workouts
  getWorkouts: async (): Promise<WorkoutSession[]> => {
    const data = await fetchApi<{ workouts: WorkoutSession[] }>('/api/workouts');
    return data.workouts || [];
  },
  
  createWorkout: (workout: Omit<WorkoutSession, 'id' | 'createdAt' | 'updatedAt'>) =>
    fetchApi<{ workout: WorkoutSession }>('/api/workouts', {
      method: 'POST',
      body: JSON.stringify(workout),
    }),

  // Goals
  getGoals: async (): Promise<Goal[]> => {
    const data = await fetchApi<{ goals: Goal[] }>('/api/goals');
    return data.goals || [];
  },
};
