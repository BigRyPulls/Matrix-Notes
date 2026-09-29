import type { ExerciseMetric } from '../types';

export interface SeedCategory {
  name: string;
  color: string;
  exercises: Array<{ name: string; metric: ExerciseMetric }>;
}

/** Compact default catalog inspired by classic workout loggers — not a clone of any app's list. */
export const DEFAULT_CATALOG: SeedCategory[] = [
  {
    name: 'Chest',
    color: '#4ade80',
    exercises: [
      { name: 'Barbell Bench Press', metric: 'weight_reps' },
      { name: 'Incline Barbell Bench Press', metric: 'weight_reps' },
      { name: 'Dumbbell Bench Press', metric: 'weight_reps' },
      { name: 'Incline Dumbbell Press', metric: 'weight_reps' },
      { name: 'Chest Fly', metric: 'weight_reps' },
      { name: 'Cable Crossover', metric: 'weight_reps' },
      { name: 'Push Up', metric: 'bodyweight_reps' },
      { name: 'Dips (Chest)', metric: 'bodyweight_reps' },
    ],
  },
  {
    name: 'Back',
    color: '#34d399',
    exercises: [
      { name: 'Deadlift', metric: 'weight_reps' },
      { name: 'Barbell Row', metric: 'weight_reps' },
      { name: 'Dumbbell Row', metric: 'weight_reps' },
      { name: 'Lat Pulldown', metric: 'weight_reps' },
      { name: 'Pull Up', metric: 'bodyweight_reps' },
      { name: 'Chin Up', metric: 'bodyweight_reps' },
      { name: 'Seated Cable Row', metric: 'weight_reps' },
      { name: 'Face Pull', metric: 'weight_reps' },
      { name: 'Hyperextension', metric: 'bodyweight_reps' },
    ],
  },
  {
    name: 'Shoulders',
    color: '#6ee7b7',
    exercises: [
      { name: 'Overhead Press', metric: 'weight_reps' },
      { name: 'Dumbbell Shoulder Press', metric: 'weight_reps' },
      { name: 'Lateral Raise', metric: 'weight_reps' },
      { name: 'Front Raise', metric: 'weight_reps' },
      { name: 'Rear Delt Fly', metric: 'weight_reps' },
      { name: 'Upright Row', metric: 'weight_reps' },
      { name: 'Shrugs', metric: 'weight_reps' },
    ],
  },
  {
    name: 'Biceps',
    color: '#86efac',
    exercises: [
      { name: 'Barbell Curl', metric: 'weight_reps' },
      { name: 'Dumbbell Curl', metric: 'weight_reps' },
      { name: 'Hammer Curl', metric: 'weight_reps' },
      { name: 'Preacher Curl', metric: 'weight_reps' },
      { name: 'Cable Curl', metric: 'weight_reps' },
    ],
  },
  {
    name: 'Triceps',
    color: '#a7f3d0',
    exercises: [
      { name: 'Tricep Pushdown', metric: 'weight_reps' },
      { name: 'Skull Crusher', metric: 'weight_reps' },
      { name: 'Overhead Tricep Extension', metric: 'weight_reps' },
      { name: 'Close Grip Bench Press', metric: 'weight_reps' },
      { name: 'Dips (Triceps)', metric: 'bodyweight_reps' },
    ],
  },
  {
    name: 'Legs',
    color: '#39ff88',
    exercises: [
      { name: 'Back Squat', metric: 'weight_reps' },
      { name: 'Front Squat', metric: 'weight_reps' },
      { name: 'Leg Press', metric: 'weight_reps' },
      { name: 'Romanian Deadlift', metric: 'weight_reps' },
      { name: 'Leg Extension', metric: 'weight_reps' },
      { name: 'Leg Curl', metric: 'weight_reps' },
      { name: 'Walking Lunge', metric: 'weight_reps' },
      { name: 'Bulgarian Split Squat', metric: 'weight_reps' },
      { name: 'Calf Raise', metric: 'weight_reps' },
      { name: 'Hip Thrust', metric: 'weight_reps' },
    ],
  },
  {
    name: 'Core',
    color: '#22c55e',
    exercises: [
      { name: 'Plank', metric: 'duration' },
      { name: 'Crunch', metric: 'bodyweight_reps' },
      { name: 'Hanging Leg Raise', metric: 'bodyweight_reps' },
      { name: 'Cable Crunch', metric: 'weight_reps' },
      { name: 'Russian Twist', metric: 'bodyweight_reps' },
      { name: 'Ab Wheel', metric: 'bodyweight_reps' },
    ],
  },
  {
    name: 'Cardio',
    color: '#10b981',
    exercises: [
      { name: 'Running', metric: 'distance' },
      { name: 'Cycling', metric: 'distance' },
      { name: 'Rowing Machine', metric: 'distance' },
      { name: 'Jump Rope', metric: 'duration' },
      { name: 'Stair Climber', metric: 'duration' },
    ],
  },
  {
    name: 'Olympic',
    color: '#059669',
    exercises: [
      { name: 'Power Clean', metric: 'weight_reps' },
      { name: 'Hang Clean', metric: 'weight_reps' },
      { name: 'Snatch', metric: 'weight_reps' },
      { name: 'Clean and Jerk', metric: 'weight_reps' },
    ],
  },
  {
    name: 'Other',
    color: '#64748b',
    exercises: [
      { name: 'Farmer Walk', metric: 'weight_duration' },
      { name: 'Battle Ropes', metric: 'duration' },
      { name: 'Kettlebell Swing', metric: 'weight_reps' },
    ],
  },
];
