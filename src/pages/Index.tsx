import { MadeWithDyad } from "@/components/made-with-dyad";
import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsersIcon, FileTextIcon, PackageIcon } from "lucide-react";

const Index = () => {
  const { user } = useSession();
  const navigate = useNavigate();
  const [clientCount, setClientCount] = useState<number | null>(null);
  const [notarizationCount, setNotarizationCount] = useState<number | null>(null);
  const [orderCount, setOrderCount] = useState<number | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const fetchCounts = useCallback(async () => {
    if (!user) return;
    setLoadingStats(true);

    try {
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
    } catch (error: any) {
      console.error('Error fetching dashboard counts:', error.message);
    } finally {
      setLoadingStats(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-4xl bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md mt-8">
        <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white text-center">
          Welcome, {user?.email}!
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 text-center">
          Your Notary Office Manager Dashboard
        </p>

        <div className="grid gap-4 md:grid-cols-3 mb-8">
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
        </div>

        <div className="flex flex-col space-y-4">
          <Button asChild>
            <Link to="/clients">Manage Clients</Link>
          </Button>
          <Button asChild>
            <Link to="/notarizations">Manage Notarizations</Link>
          </Button>
          <Button asChild>
            <Link to="/orders">Manage Orders</Link>
          </Button>
          <Button asChild>
            <Link to="/profile">Manage Profile</Link>
          </Button>
          <Button onClick={handleLogout} variant="destructive">
            Logout
          </Button>
        </div>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;