export interface Set {
  reps?: number;
  weight?: number;
  duration?: number;
  distance?: number;
}

export interface Exercise {
  name: string;
  sets: Set[];
}

export interface WorkoutData {
  name: string;
  type: 'strength' | 'cardio';
  exercises: Exercise[];
  date: string;
}