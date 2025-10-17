"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Loader2Icon, UsersIcon, MoreHorizontalIcon, MailIcon, BanIcon, CheckCircleIcon, UserCogIcon } from 'lucide-react';
import { format } from 'date-fns';

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  role: 'owner' | 'sub_user' | 'admin';
  owner_id: string | null;
  created_at: string;
  is_active: boolean; // Added is_active
}

const AdminDashboardPage: React.FC = () => {
  const { user: currentUser, profile: currentProfile, isLoading: isSessionLoading } = useSession();
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // To track loading state for specific user actions

  const fetchAllUsers = useCallback(async () => {
    if (!currentUser || currentProfile?.role !== 'admin') {
      setLoadingUsers(false);
      return;
    }

    setLoadingUsers(true);
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role, owner_id, created_at, is_active'); // Select is_active

      if (profilesError) throw profilesError;

      const userIds = profilesData.map(p => p.id);
      const { data: authUsersData, error: authUsersError } = await supabase
        .from('users')
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
          is_active: profile.is_active,
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

  const handleSendPasswordReset = async (email: string) => {
    setActionLoading(`reset-${email}`);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login?reset=true`,
      });
      if (error) throw error;
      showSuccess(`Password reset email sent to ${email}.`);
    } catch (error: any) {
      console.error('Error sending password reset:', error.message);
      showError(`Failed to send password reset: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleActiveStatus = async (userId: string, currentStatus: boolean) => {
    setActionLoading(`toggle-active-${userId}`);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;
      showSuccess(`User account ${!currentStatus ? 'activated' : 'suspended'} successfully!`);
      fetchAllUsers(); // Refresh user list
    } catch (error: any) {
      console.error('Error toggling user active status:', error.message);
      showError(`Failed to toggle user status: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleChangeUserRole = async (userId: string, newRole: 'owner' | 'sub_user' | 'admin') => {
    setActionLoading(`change-role-${userId}`);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;
      showSuccess(`User role updated to ${newRole} successfully!`);
      fetchAllUsers(); // Refresh user list
    } catch (error: any) {
      console.error('Error changing user role:', error.message);
      showError(`Failed to change user role: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

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
                      <TableHead>Status</TableHead> {/* New column */}
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
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${user.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                            {user.is_active ? 'Active' : 'Suspended'}
                          </span>
                        </TableCell>
                        <TableCell>{format(new Date(user.created_at), 'PPP')}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontalIcon className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => handleSendPasswordReset(user.email)}
                                disabled={actionLoading === `reset-${user.email}`}
                              >
                                {actionLoading === `reset-${user.email}` ? (
                                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <MailIcon className="mr-2 h-4 w-4" />
                                )}
                                Send Password Reset
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleToggleActiveStatus(user.id, user.is_active)}
                                disabled={actionLoading === `toggle-active-${user.id}`}
                              >
                                {actionLoading === `toggle-active-${user.id}` ? (
                                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                                ) : user.is_active ? (
                                  <BanIcon className="mr-2 h-4 w-4 text-red-500" />
                                ) : (
                                  <CheckCircleIcon className="mr-2 h-4 w-4 text-green-500" />
                                )}
                                {user.is_active ? 'Suspend Account' : 'Activate Account'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel>Change Role</DropdownMenuLabel>
                              {['owner', 'sub_user', 'admin'].map((role) => (
                                <DropdownMenuItem
                                  key={role}
                                  onClick={() => handleChangeUserRole(user.id, role as 'owner' | 'sub_user' | 'admin')}
                                  disabled={user.role === role || actionLoading === `change-role-${user.id}`}
                                >
                                  {actionLoading === `change-role-${user.id}` && user.role !== role ? (
                                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <UserCogIcon className="mr-2 h-4 w-4" />
                                  )}
                                  Set as {role.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
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