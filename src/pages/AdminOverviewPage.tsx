"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2Icon, UsersIcon, CreditCardIcon, FileTextIcon, PackageIcon, DollarSignIcon, TrendingUpIcon, TrendingDownIcon } from 'lucide-react';

const AdminOverviewPage: React.FC = () => {
  const { user: currentUser, profile: currentProfile, isLoading: isSessionLoading } = useSession();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSubscriptions: 0,
    totalClients: 0,
    totalNotarizations: 0,
    totalOrders: 0,
    totalIncome: 0,
    totalExpenses: 0,
    netProfit: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchAdminOverviewStats = useCallback(async () => {
    if (!currentUser || currentProfile?.role !== 'admin') {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Total Users
      const { count: totalUsersCount, error: usersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      if (usersError) throw usersError;

      // Active Subscriptions
      const { count: activeSubscriptionsCount, error: subscriptionsError } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .in('status', ['active', 'trialing']);
      if (subscriptionsError) throw subscriptionsError;

      // Total Clients
      const { count: totalClientsCount, error: clientsError } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });
      if (clientsError) throw clientsError;

      // Total Notarizations
      const { count: totalNotarizationsCount, error: notarizationsError } = await supabase
        .from('notarizations')
        .select('*', { count: 'exact', head: true });
      if (notarizationsError) throw notarizationsError;

      // Total Orders
      const { count: totalOrdersCount, error: ordersError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });
      if (ordersError) throw ordersError;

      // Total Income
      const { data: incomeData, error: incomeError } = await supabase
        .from('income')
        .select('amount');
      if (incomeError) throw incomeError;
      const totalIncomeSum = incomeData.reduce((sum, record) => sum + record.amount, 0);

      // Total Expenses
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .select('amount');
      if (expenseError) throw expenseError;
      const totalExpensesSum = expenseData.reduce((sum, record) => sum + record.amount, 0);

      setStats({
        totalUsers: totalUsersCount || 0,
        activeSubscriptions: activeSubscriptionsCount || 0,
        totalClients: totalClientsCount || 0,
        totalNotarizations: totalNotarizationsCount || 0,
        totalOrders: totalOrdersCount || 0,
        totalIncome: totalIncomeSum,
        totalExpenses: totalExpensesSum,
        netProfit: totalIncomeSum - totalExpensesSum,
      });

    } catch (error: any) {
      console.error('Error fetching admin overview stats:', error.message);
      showError('Failed to load admin overview data.');
    } finally {
      setLoading(false);
    }
  }, [currentUser, currentProfile]);

  useEffect(() => {
    if (!isSessionLoading && currentUser && currentProfile?.role === 'admin') {
      fetchAdminOverviewStats();
    }
  }, [currentUser, currentProfile, isSessionLoading, fetchAdminOverviewStats]);

  if (isSessionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <Loader2Icon className="h-8 w-8 animate-spin text-gray-700 dark:text-gray-300" />
        <p className="ml-2 text-lg text-gray-700 dark:text-gray-300">Loading admin overview...</p>
      </div>
    );
  }

  if (!currentUser || currentProfile?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-lg text-red-500">Access Denied: Only administrators can view this page.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-7xl bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md mt-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Admin Overview</h1>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <UsersIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">All registered users</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
              <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
              <p className="text-xs text-muted-foreground">Currently active plans</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              <UsersIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalClients}</div>
              <p className="text-xs text-muted-foreground">Clients across all users</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Notarizations</CardTitle>
              <FileTextIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalNotarizations}</div>
              <p className="text-xs text-muted-foreground">Notarization records across all users</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <PackageIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
              <p className="text-xs text-muted-foreground">Service orders across all users</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Income</CardTitle>
              <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalIncome.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Aggregated income across all users</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingDownIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalExpenses.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Aggregated expenses across all users</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Profit (All Users)</CardTitle>
              <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${stats.netProfit.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">Total income minus total expenses</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminOverviewPage;