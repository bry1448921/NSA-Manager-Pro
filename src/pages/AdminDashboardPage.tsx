"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2Icon, UsersIcon } from 'lucide-react';
import { format } from 'date-fns';

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string; // Assuming email can be fetched or is part of profile for admin
  role: 'owner' | 'sub_user' | 'admin';
  owner_id: string | null;
  created_at: string; // Assuming created_at is available from profiles or auth.users
}

const AdminDashboardPage: React.FC = () => {
  const { user: currentUser, profile: currentProfile, isLoading: isSessionLoading } = useSession();
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const fetchAllUsers = useCallback(async () => {
    if (!currentUser || currentProfile?.role !== 'admin') {
      setLoadingUsers(false);
      return;
    }

    setLoadingUsers(true);
    try {
      // Admins can select all profiles due to updated RLS
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role, owner_id, created_at');

      if (profilesError) throw profilesError;

      // Fetch user emails from auth.users for these profiles
      const userIds = profilesData.map(p => p.id);
      const { data: authUsersData, error: authUsersError } = await supabase
        .from('users') // This assumes a public view or admin access to auth.users
        .select('id, email')
        .in('id', userIds);

      if (authUsersError) throw authUsersError;

      const usersWithEmails = profilesData.map(profile => {
        const authUser = authUsersData.find(au => au.id === profile.id);
        return {
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: authUser?.email || 'N/A',
          role: profile.role,
          owner_id: profile.owner_id,
          created_at: profile.created_at,
        };
      });

      setAllUsers(usersWithEmails);
    } catch (error: any) {
      console.error('Error fetching all users for admin dashboard:', error.message);
      showError('Failed to load all users.');
    } finally {
      setLoadingUsers(false);
    }
  }, [currentUser, currentProfile]);

  useEffect(() => {
    if (!isSessionLoading && currentUser && currentProfile?.role === 'admin') {
      fetchAllUsers();
    }
  }, [currentUser, currentProfile, isSessionLoading, fetchAllUsers]);

  if (isSessionLoading || loadingUsers) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <Loader2Icon className="h-8 w-8 animate-spin text-gray-700 dark:text-gray-300" />
        <p className="ml-2 text-lg text-gray-700 dark:text-gray-300">Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-6xl bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md mt-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Admin Dashboard</h1>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UsersIcon className="mr-2 h-5 w-5" /> All Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allUsers.length === 0 ? (
              <p className="text-center text-gray-600 dark:text-gray-400">No users found.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Member Since</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.first_name} {user.last_name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell className="capitalize">{user.role}</TableCell>
                        <TableCell>{user.owner_id ? user.owner_id : 'N/A (Owner)'}</TableCell>
                        <TableCell>{format(new Date(user.created_at), 'PPP')}</TableCell>
                        <TableCell className="text-right">
                          {/* Placeholder for admin actions like suspend, change plan, etc. */}
                          <Button variant="outline" size="sm" disabled>Manage</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboardPage;