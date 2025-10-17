"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DateRangePicker } from '@/components/reports/DateRangePicker';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { Loader2Icon, DollarSignIcon, TrendingUpIcon, TrendingDownIcon, FileDownIcon, DownloadIcon } from 'lucide-react';
import { exportToCsv } from '@/utils/report-exports';
import { exportToPdf } from '@/utils/report-pdf-exports';

interface SubscriptionRecord {
  id: string;
  user_id: string;
  status: string;
  price_id: string;
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  cancel_at_period_end: boolean;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
}

const AdminSalesReportsPage: React.FC = () => {
  const { user: currentUser, profile: currentProfile, isLoading: isSessionLoading } = useSession();
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  });

  const fetchSalesData = useCallback(async () => {
    if (!currentUser || currentProfile?.role !== 'admin') {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('subscriptions')
        .select(`
          id,
          user_id,
          status,
          price_id,
          current_period_start,
          current_period_end,
          created_at,
          cancel_at_period_end,
          profiles (first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });

      if (dateRange?.from) {
        query = query.gte('created_at', format(dateRange.from, 'yyyy-MM-dd'));
      }
      if (dateRange?.to) {
        query = query.lte('created_at', format(dateRange.to, 'yyyy-MM-dd'));
      }

      const { data, error } = await query;

      if (error) throw error;
      setSubscriptions(((data || []) as any[]).map((s: any) => {
        const profiles = Array.isArray(s.profiles) ? (s.profiles[0] ?? null) : s.profiles;
        return { ...s, profiles } as SubscriptionRecord;
      }));
    } catch (error: any) {
      console.error('Error fetching sales data:', error.message);
      showError('Failed to fetch sales data.');
    } finally {
      setLoading(false);
    }
  }, [currentUser, currentProfile, dateRange]);

  useEffect(() => {
    if (!isSessionLoading && currentUser && currentProfile?.role === 'admin') {
      fetchSalesData();
    }
  }, [currentUser, currentProfile, isSessionLoading, fetchSalesData]);

  const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active' || sub.status === 'trialing');
  const newSubscriptions = subscriptions.filter(sub => sub.status === 'active' || sub.status === 'trialing');
  const canceledSubscriptions = subscriptions.filter(sub => sub.status === 'canceled' || sub.cancel_at_period_end);

  const handleExportCsv = () => {
    const reportData = subscriptions.map(sub => ({
      'Subscription ID': sub.id,
      'User ID': sub.user_id,
      'User Name': sub.profiles ? `${sub.profiles.first_name} ${sub.profiles.last_name}` : 'N/A',
      'User Email': sub.profiles?.email || 'N/A',
      'Status': sub.status,
      'Price ID': sub.price_id,
      'Period Start': format(new Date(sub.current_period_start), 'yyyy-MM-dd'),
      'Period End': format(new Date(sub.current_period_end), 'yyyy-MM-dd'),
      'Created At': format(new Date(sub.created_at), 'yyyy-MM-dd HH:mm:ss'),
    }));
    exportToCsv('admin_sales_report.csv', reportData);
  };

  const handleExportPdf = () => {
    exportToPdf('admin-sales-report-content', 'admin_sales_report.pdf');
  };

  if (isSessionLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <Loader2Icon className="h-8 w-8 animate-spin text-gray-700 dark:text-gray-300" />
        <p className="ml-2 text-lg text-gray-700 dark:text-gray-300">Loading sales reports...</p>
      </div>
    );
  }

  if (!currentUser || currentProfile?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-lg text-red-500">Access Denied: Only administrators can view sales reports.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-7xl bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md mt-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Admin Sales Reports</h1>

        <div className="flex flex-wrap gap-4 items-end mb-6">
          <DateRangePicker date={dateRange} setDate={setDateRange} />
          <Button onClick={handleExportCsv} disabled={subscriptions.length === 0}>
            <DownloadIcon className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={handleExportPdf} disabled={subscriptions.length === 0} variant="outline">
            <FileDownIcon className="mr-2 h-4 w-4" /> Export PDF
          </Button>
        </div>

        <div id="admin-sales-report-content" className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Active Subscriptions</CardTitle>
                <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeSubscriptions.length}</div>
                <p className="text-xs text-muted-foreground">Currently active plans</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">New Subscriptions (in range)</CardTitle>
                <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{newSubscriptions.length}</div>
                <p className="text-xs text-muted-foreground">Created within selected date range</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Canceled Subscriptions (in range)</CardTitle>
                <TrendingDownIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{canceledSubscriptions.length}</div>
                <p className="text-xs text-muted-foreground">Canceled within selected date range</p>
              </CardContent>
            </Card>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">All Subscriptions</h2>
          {subscriptions.length === 0 ? (
            <p className="text-center text-gray-600 dark:text-gray-400">No subscription records found for the selected filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User Name</TableHead>
                    <TableHead>User Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Plan (Price ID)</TableHead>
                    <TableHead>Period End</TableHead>
                    <TableHead>Created At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>{sub.profiles ? `${sub.profiles.first_name} ${sub.profiles.last_name}` : 'N/A'}</TableCell>
                      <TableCell>{sub.profiles?.email || 'N/A'}</TableCell>
                      <TableCell className="capitalize">{sub.status}</TableCell>
                      <TableCell>{sub.price_id}</TableCell>
                      <TableCell>{format(new Date(sub.current_period_end), 'PPP')}</TableCell>
                      <TableCell>{format(new Date(sub.created_at), 'PPP')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSalesReportsPage;