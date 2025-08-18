import { Calendar, Dumbbell, Heart, Plus } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Fitness Tracker
          </h1>
          <p className="text-xl text-gray-600">
            Track your cardio and weightlifting progress
          </p>
        </header>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <Dumbbell className="h-8 w-8 text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">Strength Training</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Track your weightlifting sessions, sets, reps, and progress over time.
            </p>
            <Link 
              href="/workouts/strength" 
              className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
            >
              Start Workout
              <Plus className="h-4 w-4 ml-1" />
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <Heart className="h-8 w-8 text-red-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">Cardio</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Log your cardio sessions including duration, distance, and intensity.
            </p>
            <Link 
              href="/workouts/cardio" 
              className="inline-flex items-center text-red-600 hover:text-red-800 font-medium"
            >
              Start Cardio
              <Plus className="h-4 w-4 ml-1" />
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <Calendar className="h-8 w-8 text-green-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">Workout History</h2>
            </div>
            <p className="text-gray-600 mb-4">
              View your past workouts and track your fitness journey.
            </p>
            <Link 
              href="/history" 
              className="inline-flex items-center text-green-600 hover:text-green-800 font-medium"
            >
              View History
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="text-gray-600">
            <p>No recent workouts. Start your first workout above!</p>
          </div>
        </div>
      </div>
    </div>
  );
}