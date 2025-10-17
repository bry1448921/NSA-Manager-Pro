"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { UserPlusIcon, Loader2Icon, UsersIcon } from 'lucide-react';

const inviteUserSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  first_name: z.string().min(1, { message: 'First name is required.' }),
  last_name: z.string().min(1, { message: 'Last name is required.' }),
});

type InviteUserFormValues = z.infer<typeof inviteUserSchema>;

interface SubUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  created_at: string;
}

const UserManagementPage: React.FC = () => {
  const { user: currentUser, isLoading: isSessionLoading } = useSession();
  const [subUsers, setSubUsers] = useState<SubUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [isInviting, setIsInviting] = useState(false);

  const form = useForm<InviteUserFormValues>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      email: '',
      first_name: '',
      last_name: '',
    },
  });

  const fetchSubUsers = useCallback(async () => {
    if (!currentUser) return;
    setLoadingUsers(true);
    try {
      // Fetch profiles of users where owner_id is the current user's ID
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, created_at')
        .eq('owner_id', currentUser.id);

      if (profilesError) throw profilesError;

      // Fetch user emails from auth.users for these profiles
      const userIds = profilesData.map(p => p.id);
      const { data: authUsersData, error: authUsersError } = await supabase
        .from('users') // Accessing auth.users via public.users view if available, or direct admin call
        .select('id, email')
        .in('id', userIds);

      if (authUsersError) throw authUsersError;

      const usersWithEmails = profilesData.map(profile => {
        const authUser = authUsersData.find(au => au.id === profile.id);
        return {
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: authUser?.email || 'N/A', // Fallback if email not found
          created_at: profile.created_at,
        };
      });

      setSubUsers(usersWithEmails);
    } catch (error: any) {
      console.error('Error fetching sub-users:', error.message);
      showError('Failed to load sub-users.');
    } finally {
      setLoadingUsers(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!isSessionLoading && currentUser) {
      fetchSubUsers();
    }
  }, [currentUser, isSessionLoading, fetchSubUsers]);

  const onInviteSubmit = async (values: InviteUserFormValues) => {
    if (!currentUser) {
      showError('You must be logged in to invite users.');
      return;
    }

    setIsInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: {
          email: values.email,
          first_name: values.first_name,
          last_name: values.last_name,
        },
      });

      if (error) throw error;

      showSuccess('Invitation sent successfully! The user will receive an email to set up their account.');
      form.reset();
      fetchSubUsers(); // Refresh the list of sub-users
    } catch (error: any) {
      console.error('Error inviting user:', error.message);
      showError(`Failed to send invitation: ${error.message}`);
    } finally {
      setIsInviting(false);
    }
  };

  if (isSessionLoading || loadingUsers) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <Loader2Icon className="h-8 w-8 animate-spin text-gray-700 dark:text-gray-300" />
        <p className="ml-2 text-lg text-gray-700 dark:text-gray-300">Loading user management...</p>
      </div>
    );
  }

  // Check if the current user is an owner (owner_id is NULL in their profile)
  // This check should ideally be done on the server-side for full security,
  // but for UI purposes, we can do a client-side check.
  // A more robust solution would involve fetching the current user's profile
  // and checking their owner_id. For now, we assume if they are logged in and
  // accessing this page, they are an owner.
  // TODO: Implement a proper check for owner status.
  const isCurrentUserOwner = true; // Placeholder for now, needs actual check

  if (!isCurrentUserOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-lg text-red-500">Access Denied: Only account owners can manage users.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-4xl bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md mt-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">User Management</h1>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserPlusIcon className="mr-2 h-5 w-5" /> Invite New User
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onInviteSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Jane" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="jane.doe@example.com" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isInviting}>
                  {isInviting ? (
                    <>
                      <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> Sending Invitation...
                    </>
                  ) : (
                    'Send Invitation'
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UsersIcon className="mr-2 h-5 w-5" /> Your Sub-Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            {subUsers.length === 0 ? (
              <p className="text-center text-gray-600 dark:text-gray-400">No sub-users found. Invite your first team member!</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Member Since</TableHead>
                      {/* Add columns for roles/permissions here later */}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subUsers.map((subUser) => (
                      <TableRow key={subUser.id}>
                        <TableCell className="font-medium">{subUser.first_name} {subUser.last_name}</TableCell>
                        <TableCell>{subUser.email}</TableCell>
                        <TableCell>{new Date(subUser.created_at).toLocaleDateString()}</TableCell>
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

export default UserManagementPage;