'use client';

import { useState } from 'react';
import { Save, Plus, Minus } from 'lucide-react';
import { Set, Exercise, WorkoutData } from '@/types/workout';

interface WorkoutFormProps {
  type: 'strength' | 'cardio';
  onSave: (workout: WorkoutData) => void;
}

export default function WorkoutForm({ type, onSave }: WorkoutFormProps) {
  const [workoutName, setWorkoutName] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentExercise, setCurrentExercise] = useState('');

  const addExercise = () => {
    if (currentExercise.trim()) {
      setExercises([...exercises, { name: currentExercise, sets: [{}] }]);
      setCurrentExercise('');
    }
  };

  const addSet = (exerciseIndex: number) => {
    const newExercises = [...exercises];
    newExercises[exerciseIndex].sets.push({});
    setExercises(newExercises);
  };

  const updateSet = (exerciseIndex: number, setIndex: number, field: keyof Set, value: number) => {
    const newExercises = [...exercises];
    newExercises[exerciseIndex].sets[setIndex] = {
      ...newExercises[exerciseIndex].sets[setIndex],
      [field]: value
    };
    setExercises(newExercises);
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    const newExercises = [...exercises];
    newExercises[exerciseIndex].sets.splice(setIndex, 1);
    setExercises(newExercises);
  };

  const handleSave = () => {
    const workout = {
      name: workoutName,
      type,
      exercises,
      date: new Date().toISOString()
    };
    onSave(workout);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        {type === 'strength' ? 'Strength Training' : 'Cardio'} Workout
      </h2>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Workout Name
        </label>
        <input
          type="text"
          value={workoutName}
          onChange={(e) => setWorkoutName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter workout name"
        />
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Add Exercise
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={currentExercise}
            onChange={(e) => setCurrentExercise(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Exercise name"
            onKeyPress={(e) => e.key === 'Enter' && addExercise()}
          />
          <button
            onClick={addExercise}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {exercises.map((exercise, exerciseIndex) => (
        <div key={exerciseIndex} className="mb-6 p-4 border border-gray-200 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">{exercise.name}</h3>
          
          {exercise.sets.map((set, setIndex) => (
            <div key={setIndex} className="flex gap-2 mb-2 items-center">
              <span className="text-sm text-gray-600 w-12">Set {setIndex + 1}:</span>
              
              {type === 'strength' ? (
                <>
                  <input
                    type="number"
                    placeholder="Reps"
                    value={set.reps || ''}
                    onChange={(e) => updateSet(exerciseIndex, setIndex, 'reps', parseInt(e.target.value))}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <span className="text-xs text-gray-500">reps</span>
                  <input
                    type="number"
                    placeholder="Weight"
                    value={set.weight || ''}
                    onChange={(e) => updateSet(exerciseIndex, setIndex, 'weight', parseFloat(e.target.value))}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <span className="text-xs text-gray-500">lbs</span>
                </>
              ) : (
                <>
                  <input
                    type="number"
                    placeholder="Duration"
                    value={set.duration || ''}
                    onChange={(e) => updateSet(exerciseIndex, setIndex, 'duration', parseInt(e.target.value))}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <span className="text-xs text-gray-500">min</span>
                  <input
                    type="number"
                    placeholder="Distance"
                    value={set.distance || ''}
                    onChange={(e) => updateSet(exerciseIndex, setIndex, 'distance', parseFloat(e.target.value))}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <span className="text-xs text-gray-500">miles</span>
                </>
              )}
              
              <button
                onClick={() => removeSet(exerciseIndex, setIndex)}
                className="p-1 text-red-600 hover:text-red-800"
              >
                <Minus className="h-4 w-4" />
              </button>
            </div>
          ))}
          
          <button
            onClick={() => addSet(exerciseIndex)}
            className="mt-2 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Set
          </button>
        </div>
      ))}

      <button
        onClick={handleSave}
        disabled={!workoutName || exercises.length === 0}
        className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
      >
        <Save className="h-4 w-4 mr-2" />
        Save Workout
      </button>
    </div>
  );
}