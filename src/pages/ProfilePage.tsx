"use client";

import React from 'react';
import ProfileForm from '@/components/ProfileForm';
// Removed Link and Button imports as they are no longer needed for the back button

const ProfilePage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md mt-8">
        <div className="flex items-center mb-6">
          {/* Removed the back button as navigation is now handled by the sidebar */}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Your Profile</h1>
        </div>
        <ProfileForm />
      </div>
    </div>
  );
};

export default ProfilePage;