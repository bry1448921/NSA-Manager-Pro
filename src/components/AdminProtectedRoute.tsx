"use client";

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSession } from '@/contexts/SessionContext';
import { Loader2Icon } from 'lucide-react';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ children }) => {
  const { user, profile, isLoading } = useSession();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <Loader2Icon className="h-8 w-8 animate-spin text-gray-700 dark:text-gray-300" />
        <p className="ml-2 text-lg text-gray-700 dark:text-gray-300">Loading user data...</p>
      </div>
    );
  }

  if (!user) {
    // Not logged in, redirect to login
    return <Navigate to="/login" replace />;
  }

  if (profile?.role !== 'admin') {
    // Logged in but not an admin, redirect to dashboard or show access denied
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default AdminProtectedRoute;