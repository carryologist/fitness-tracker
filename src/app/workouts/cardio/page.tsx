'use client';

import { useRouter } from 'next/navigation';
import WorkoutForm from '@/components/WorkoutForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { WorkoutData } from '@/types/workout';

export default function CardioWorkout() {
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
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-6">
          <Link 
            href="/" 
            className="inline-flex items-center text-red-600 hover:text-red-800 font-medium"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Home
          </Link>
        </div>
        
        <WorkoutForm type="cardio" onSave={handleSave} />
      </div>
    </div>
  );
}