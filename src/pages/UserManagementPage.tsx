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
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { UserCogIcon, Loader2Icon, UsersIcon } from 'lucide-react';

const PRIVILEGE_OPTIONS = [
  'orders',
  'notarizations',
  'reports',
  'credentials',
  'income',
  'expenses',
  'clients',
  'vendors',
  'employees',
];

const createSubUserSchema = z.object({
  email: z.string().email({ message: 'Valid email is required (for login).' }),
  first_name: z.string().min(1, { message: 'First name is required.' }),
  last_name: z.string().min(1, { message: 'Last name is required.' }),
  job_role: z.string().min(1, { message: 'Job role is required.' }),
  supervisor: z.string().min(1, { message: 'Supervisor is required.' }),
  privileges: z.array(z.string()).min(1, { message: 'Select at least one privilege.' }),
});

type CreateSubUserFormValues = z.infer<typeof createSubUserSchema>;

interface SubUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  job_role: string | null;
  supervisor: string | null;
  privileges: string[];
  role: 'owner' | 'sub_user' | 'admin';
  is_active: boolean;
  created_at: string;
}

const UserManagementPage: React.FC = () => {
  const { user: currentUser, profile: currentProfile, isLoading: isSessionLoading } = useSession();
  const [subUsers, setSubUsers] = useState<SubUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const form = useForm<CreateSubUserFormValues>({
    resolver: zodResolver(createSubUserSchema),
    defaultValues: {
      email: '',
      first_name: '',
      last_name: '',
      job_role: '',
      supervisor: '',
      privileges: [],
    },
  });

  const fetchSubUsers = useCallback(async () => {
    if (!currentUser) return;
    setLoadingUsers(true);
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, job_role, supervisor, privileges, role, is_active, created_at')
        .eq('owner_id', currentUser.id);

      if (profilesError) throw profilesError;

      const userIds = (profilesData || []).map(p => p.id);
      const { data: authUsersData, error: authUsersError } = await supabase
        .from('users')
        .select('id, email')
        .in('id', userIds);

      if (authUsersError) throw authUsersError;

      const usersWithDetails = (profilesData || []).map(profile => {
        const authUser = authUsersData?.find(au => au.id === profile.id);
        return {
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: authUser?.email || 'N/A',
          job_role: (profile as any).job_role ?? null,
          supervisor: (profile as any).supervisor ?? null,
          privileges: Array.isArray((profile as any).privileges) ? (profile as any).privileges : [],
          role: (profile as any).role,
          is_active: (profile as any).is_active,
          created_at: (profile as any).created_at,
        } as SubUser;
      });

      setSubUsers(usersWithDetails);
    } catch (error: any) {
      console.error('Error fetching sub-users:', error.message);
      showError('Failed to load authorized users.');
    } finally {
      setLoadingUsers(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!isSessionLoading && currentUser) {
      fetchSubUsers();
    }
  }, [currentUser, isSessionLoading, fetchSubUsers]);

  const onCreateSubUser = async (values: CreateSubUserFormValues) => {
    if (!currentUser) {
      showError('You must be logged in to create users.');
      return;
    }
    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-sub-user', {
        body: {
          email: values.email,
          first_name: values.first_name,
          last_name: values.last_name,
          job_role: values.job_role,
          supervisor: values.supervisor,
          privileges: values.privileges,
        },
      });

      if (error) throw error;

      const tempPwd = (data as any)?.temp_password;
      showSuccess(
        tempPwd
          ? `User created. Share the temporary password with them: ${tempPwd}`
          : 'User created successfully.'
      );
      form.reset();
      fetchSubUsers();
    } catch (error: any) {
      console.error('Error creating authorized user:', error.message);
      showError(`Failed to create user: ${error.message}`);
    } finally {
      setIsCreating(false);
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

  // Proper owner check from profile
  const isCurrentUserOwner = currentProfile?.role === 'owner' && currentProfile?.owner_id === null;

  if (!isCurrentUserOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-lg text-red-500">Access Denied: Only account owners can manage users.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-5xl bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md mt-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">User Management</h1>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserCogIcon className="mr-2 h-5 w-5" /> Add Authorized User
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onCreateSubUser)} className="space-y-4">
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
                      <FormLabel>Email (used for login)</FormLabel>
                      <FormControl>
                        <Input placeholder="jane.doe@example.com" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="job_role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Role</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Notary Agent" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="supervisor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supervisor</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. John Smith" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="privileges"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Privileges</FormLabel>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {PRIVILEGE_OPTIONS.map((opt) => {
                          const checked = Array.isArray(field.value) ? field.value.includes(opt) : false;
                          return (
                            <label key={opt} className="flex items-center gap-2 p-2 rounded border border-gray-200 dark:border-gray-700">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(val) => {
                                  const isOn = Boolean(val);
                                  const current = Array.isArray(field.value) ? field.value : [];
                                  if (isOn && !current.includes(opt)) {
                                    field.onChange([...current, opt]);
                                  } else if (!isOn) {
                                    field.onChange(current.filter((v: string) => v !== opt));
                                  }
                                }}
                              />
                              <span className="text-sm capitalize">{opt.replace(/_/g, ' ')}</span>
                            </label>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> Creating User...
                    </>
                  ) : (
                    'Create Authorized User'
                  )}
                </Button>
              </form>
            </Form>
            <p className="text-xs text-gray-500 mt-2">
              Note: A temporary password will be generated automatically; share it with the user for their first login.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UsersIcon className="mr-2 h-5 w-5" /> Your Authorized Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            {subUsers.length === 0 ? (
              <p className="text-center text-gray-600 dark:text-gray-400">No authorized users found. Add your first team member!</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Job Role</TableHead>
                      <TableHead>Supervisor</TableHead>
                      <TableHead>Privileges</TableHead>
                      <TableHead>Member Since</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subUsers.map((subUser) => (
                      <TableRow key={subUser.id}>
                        <TableCell className="font-medium">{subUser.first_name} {subUser.last_name}</TableCell>
                        <TableCell>{subUser.email}</TableCell>
                        <TableCell>{subUser.job_role || '-'}</TableCell>
                        <TableCell>{subUser.supervisor || '-'}</TableCell>
                        <TableCell className="space-x-1">
                          {subUser.privileges?.length
                            ? subUser.privileges.map((p) => (
                                <Badge key={p} variant="secondary" className="capitalize">{p.replace(/_/g, ' ')}</Badge>
                              ))
                            : <span className="text-gray-500">-</span>}
                        </TableCell>
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