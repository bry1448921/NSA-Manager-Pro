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
import { Loader2Icon, UsersIcon, MoreHorizontalIcon, MailIcon, BanIcon, CheckCircleIcon, UserCogIcon, CreditCardIcon } from 'lucide-react';
import { format } from 'date-fns';

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  role: 'owner' | 'sub_user' | 'admin';
  owner_id: string | null;
  created_at: string;
  is_active: boolean;
  // Subscription details
  subscription_status: string | null;
  current_price_id: string | null;
  current_period_end: string | null;
  stripe_customer_id: string | null; // Needed for Stripe API calls
}

// Define available pricing plans for admin to select
const ADMIN_PRICING_PLANS = [
  { name: "Getting Started (Monthly)", priceId: "price_1RqPf62WGHZ3r9wpfEVaIfvd" },
  { name: "Getting Started (Quarterly)", priceId: "price_1RqPrY2WGHZ3r9wpGxcv07sC" },
  { name: "Getting Started (Yearly)", priceId: "price_1RqPnP2WGHZ3r9wpm1OOZWAv" },
  { name: "Up and Running (Monthly)", priceId: "price_1RqPdr2WGHZ3r9wpCuhUEuIg" },
  { name: "Up and Running (Quarterly)", priceId: "price_1RqPqd2WGHZ3r9wp8lLNYgxR" },
  { name: "Up and Running (Yearly)", priceId: "price_1RqPpY2WGHZ3r9wpJkMWis0q" },
  { name: "Professional (Monthly)", priceId: "price_1RqPgd2WGHZ3r9wprPSJumRT" },
  { name: "Professional (Quarterly)", priceId: "price_1RqPsW2WGHZ3r9wpPaAPVCb7" },
  { name: "Professional (Yearly)", priceId: "price_1RqPoY2WGHZ3r9wpd5cs8sot" },
];

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
        .select('id, first_name, last_name, role, owner_id, created_at, is_active');

      if (profilesError) throw profilesError;

      const userIds = profilesData.map(p => p.id);

      // Fetch auth.users data (email)
      const { data: authUsersData, error: authUsersError } = await supabase
        .from('users')
        .select('id, email')
        .in('id', userIds);

      if (authUsersError) throw authUsersError;

      // Fetch subscriptions and customer IDs
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from('subscriptions')
        .select('user_id, status, price_id, current_period_end');

      if (subscriptionsError) throw subscriptionsError;

      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, stripe_customer_id');

      if (customersError) throw customersError;

      const usersWithDetails = profilesData.map(profile => {
        const authUser = authUsersData.find(au => au.id === profile.id);
        const subscription = subscriptionsData.find(sub => sub.user_id === profile.id);
        const customer = customersData.find(cust => cust.id === profile.id);

        return {
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: authUser?.email || 'N/A',
          role: profile.role,
          owner_id: profile.owner_id,
          created_at: profile.created_at,
          is_active: profile.is_active,
          subscription_status: subscription?.status || null,
          current_price_id: subscription?.price_id || null,
          current_period_end: subscription?.current_period_end || null,
          stripe_customer_id: customer?.stripe_customer_id || null,
        };
      });

      setAllUsers(usersWithDetails);
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

  const handleUpdateSubscription = async (userId: string, customerId: string, newPriceId: string) => {
    setActionLoading(`update-sub-${userId}-${newPriceId}`);
    try {
      const { data, error } = await supabase.functions.invoke('update-user-subscription', {
        body: { user_id: userId, customer_id: customerId, new_price_id: newPriceId },
      });

      if (error) throw error;
      showSuccess(`Subscription updated successfully for ${data.user_email}!`);
      fetchAllUsers();
    } catch (error: any) {
      console.error('Error updating subscription:', error.message);
      showError(`Failed to update subscription: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateCompSubscription = async (userId: string, priceId: string) => {
    setActionLoading(`comp-sub-${userId}-${priceId}`);
    try {
      const { data, error } = await supabase.functions.invoke('create-comp-subscription', {
        body: { user_id: userId, price_id: priceId },
      });

      if (error) throw error;
      showSuccess(`Complimentary subscription created successfully for ${data.user_email}!`);
      fetchAllUsers();
    } catch (error: any) {
      console.error('Error creating comp subscription:', error.message);
      showError(`Failed to create comp subscription: ${error.message}`);
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
      <div className="w-full max-w-7xl bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md mt-8">
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
                      <TableHead>Status</TableHead>
                      <TableHead>Subscription</TableHead> {/* New column */}
                      <TableHead>Period End</TableHead> {/* New column */}
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.first_name} {user.last_name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell className="capitalize">{user.role}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${user.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                            {user.is_active ? 'Active' : 'Suspended'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {user.subscription_status ? (
                            <span className="capitalize">{user.subscription_status} ({ADMIN_PRICING_PLANS.find(p => p.priceId === user.current_price_id)?.name || user.current_price_id})</span>
                          ) : (
                            'None'
                          )}
                        </TableCell>
                        <TableCell>
                          {user.current_period_end ? format(new Date(user.current_period_end), 'PPP') : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontalIcon className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>User Actions</DropdownMenuLabel>
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
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel>Subscription Actions</DropdownMenuLabel>
                              {user.stripe_customer_id && user.subscription_status ? (
                                <>
                                  {ADMIN_PRICING_PLANS.map((plan) => (
                                    <DropdownMenuItem
                                      key={`update-${user.id}-${plan.priceId}`}
                                      onClick={() => handleUpdateSubscription(user.id, user.stripe_customer_id!, plan.priceId)}
                                      disabled={user.current_price_id === plan.priceId || actionLoading === `update-sub-${user.id}-${plan.priceId}`}
                                    >
                                      {actionLoading === `update-sub-${user.id}-${plan.priceId}` ? (
                                        <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                                      ) : (
                                        <CreditCardIcon className="mr-2 h-4 w-4" />
                                      )}
                                      Change to {plan.name}
                                    </DropdownMenuItem>
                                  ))}
                                </>
                              ) : (
                                <>
                                  <DropdownMenuLabel>Grant Comp Subscription</DropdownMenuLabel>
                                  {ADMIN_PRICING_PLANS.map((plan) => (
                                    <DropdownMenuItem
                                      key={`comp-${user.id}-${plan.priceId}`}
                                      onClick={() => handleCreateCompSubscription(user.id, plan.priceId)}
                                      disabled={actionLoading === `comp-sub-${user.id}-${plan.priceId}`}
                                    >
                                      {actionLoading === `comp-sub-${user.id}-${plan.priceId}` ? (
                                        <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                                      ) : (
                                        <CreditCardIcon className="mr-2 h-4 w-4" />
                                      )}
                                      Grant {plan.name}
                                    </DropdownMenuItem>
                                  ))}
                                </>
                              )}
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