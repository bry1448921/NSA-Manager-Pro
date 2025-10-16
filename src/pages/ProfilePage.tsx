"use client";

import React from 'react';
import ProfileForm from '@/components/ProfileForm';
import { MadeWithDyad } from '@/components/made-with-dyad';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon } from 'lucide-react';

const ProfilePage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md mt-8">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/">
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white ml-4">Your Profile</h1>
        </div>
        <ProfileForm />
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default ProfilePage;