import { useSession } from "@/contexts/SessionContext";
import { Link } from "react-router-dom";
import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsersIcon, FileTextIcon, PackageIcon, DollarSignIcon, TrendingUpIcon, TrendingDownIcon, CreditCardIcon } from "lucide-react"; // Added CreditCardIcon
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/use-subscription"; // Import the useSubscription hook
import FinancialSummary from "@/components/dashboard/FinancialSummary"; // New import

const Index = () => {
  const { user } = useSession();
  const { subscription, isLoading: isSubscriptionLoading } = useSubscription(); // Use the subscription hook
  const [clientCount, setClientCount] = useState<number | null>(null);
  const [notarizationCount, setNotarizationCount] = useState<number | null>(null);
  const [orderCount, setOrderCount] = useState<number | null>(null);
  const [totalIncome, setTotalIncome] = useState<number | null>(null);
  const [totalExpenses, setTotalExpenses] = useState<number | null>(null);
  const [netProfit, setNetProfit] = useState<number | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const fetchDashboardStats = useCallback(async () => {
    if (!user) return;
    setLoadingStats(true);

    try {
      // Fetch counts
      const { count: clientsCount, error: clientsError } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { count: notarizationsCount, error: notarizationsError } = await supabase
        .from('notarizations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { count: ordersCount, error: ordersError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (clientsError) throw clientsError;
      if (notarizationsError) throw notarizationsError;
      if (ordersError) throw ordersError;

      setClientCount(clientsCount);
      setNotarizationCount(notarizationsCount);
      setOrderCount(ordersCount);

      // Fetch financial summaries
      const { data: incomeData, error: incomeError } = await supabase
        .from('income')
        .select('amount')
        .eq('user_id', user.id);

      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .select('amount')
        .eq('user_id', user.id);

      if (incomeError) throw incomeError;
      if (expenseError) throw expenseError;

      const incomeSum = incomeData.reduce((sum, record) => sum + record.amount, 0);
      const expenseSum = expenseData.reduce((sum, record) => sum + record.amount, 0);
      const profit = incomeSum - expenseSum;

      setTotalIncome(incomeSum);
      setTotalExpenses(expenseSum);
      setNetProfit(profit);

    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error.message);
    } finally {
      setLoadingStats(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  return (
    <div className="flex flex-col items-center p-4">
      <div className="w-full max-w-6xl bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md mt-8">
        <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white text-center">
          Welcome, {user?.email}!
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 text-center">
          Your Notary Office Manager Dashboard
        </p>

        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Subscription Status</CardTitle>
              <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isSubscriptionLoading ? 'Loading...' : subscription ? subscription.status.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase()) : 'None'}
              </div>
              <p className="text-xs text-muted-foreground">
                {subscription ? (
                  <Link to="/manage-subscription" className="text-blue-500 hover:underline">
                    Manage Subscription
                  </Link>
                ) : (
                  <Link to="/pricing" className="text-blue-500 hover:underline">
                    View Pricing
                  </Link>
                )}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              <UsersIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loadingStats ? '...' : clientCount !== null ? clientCount : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                Clients managed in your system
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Notarizations</CardTitle>
              <FileTextIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loadingStats ? '...' : notarizationCount !== null ? notarizationCount : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                Notarization records
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <PackageIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loadingStats ? '...' : orderCount !== null ? orderCount : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                Service orders received
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Income</CardTitle>
              <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loadingStats ? '...' : totalIncome !== null ? `$${totalIncome.toFixed(2)}` : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                All recorded income
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingDownIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loadingStats ? '...' : totalExpenses !== null ? `$${totalExpenses.toFixed(2)}` : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                All recorded expenses
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
              <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loadingStats ? '...' : netProfit !== null ? `$${netProfit.toFixed(2)}` : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                Income minus expenses
              </p>
            </CardContent>
          </Card>
        </div>

        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 text-center">
          Financial Breakdown
        </h2>
        <FinancialSummary /> {/* New Financial Summary Component */}
      </div>
    </div>
  );
};

export default Index;