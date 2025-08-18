'use client';

import { useRouter } from 'next/navigation';
import WorkoutForm from '@/components/WorkoutForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { WorkoutData } from '@/types/workout';

export default function StrengthWorkout() {
  const router = useRouter();

  const handleSave = async (workout: WorkoutData) => {
    try {
      const response = await fetch('/api/workouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(workout),
      });

      if (response.ok) {
        alert('Workout saved successfully!');
        router.push('/');
      } else {
        alert('Failed to save workout');
      }
    } catch (error) {
      console.error('Error saving workout:', error);
      alert('Failed to save workout');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-6">
          <Link 
            href="/" 
            className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Home
          </Link>
        </div>
        
        <WorkoutForm type="strength" onSave={handleSave} />
      </div>
    </div>
  );
}