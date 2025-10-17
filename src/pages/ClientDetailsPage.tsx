"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2Icon, ArrowLeftIcon, FileTextIcon, PackageIcon, MailIcon, PhoneIcon, MapPinIcon } from 'lucide-react';
import { format } from 'date-fns';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
}

interface Notarization {
  id: string;
  document_type: string;
  notarization_date: string;
  status: string;
  notes: string | null;
}

interface Order {
  id: string;
  order_date: string;
  service_type: string;
  status: string;
  total_amount: number | null;
  notes: string | null;
}

const ClientDetailsPage: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { user } = useSession();
  const [client, setClient] = useState<Client | null>(null);
  const [notarizations, setNotarizations] = useState<Notarization[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClientDetails = useCallback(async () => {
    if (!user || !clientId) return;
    setLoading(true);
    setError(null);

    try {
      // Fetch client details
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .eq('user_id', user.id)
        .single();

      if (clientError) {
        if (clientError.code === 'PGRST116') { // No rows found
          setError('Client not found or you do not have permission to view it.');
        } else {
          throw clientError;
        }
      } else {
        setClient(clientData);

        // Fetch notarizations for this client
        const { data: notarizationData, error: notarizationError } = await supabase
          .from('notarizations')
          .select('id, document_type, notarization_date, status, notes')
          .eq('client_id', clientId)
          .eq('user_id', user.id)
          .order('notarization_date', { ascending: false });

        if (notarizationError) throw notarizationError;
        setNotarizations(notarizationData || []);

        // Fetch orders for this client
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('id, order_date, service_type, status, total_amount, notes')
          .eq('client_id', clientId)
          .eq('user_id', user.id)
          .order('order_date', { ascending: false });

        if (orderError) throw orderError;
        setOrders(orderData || []);
      }
    } catch (err: any) {
      console.error('Error fetching client details:', err.message);
      setError(`Failed to load client details: ${err.message}`);
      showError(`Failed to load client details: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [user, clientId]);

  useEffect(() => {
    fetchClientDetails();
  }, [fetchClientDetails]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <Loader2Icon className="h-8 w-8 animate-spin text-gray-700 dark:text-gray-300" />
        <p className="ml-2 text-lg text-gray-700 dark:text-gray-300">Loading client details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <p className="text-lg text-red-500 mb-4">{error}</p>
        <Button onClick={() => navigate('/clients')}>
          <ArrowLeftIcon className="mr-2 h-4 w-4" /> Back to Clients
        </Button>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">Client not found.</p>
        <Button onClick={() => navigate('/clients')}>
          <ArrowLeftIcon className="mr-2 h-4 w-4" /> Back to Clients
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-6xl bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md mt-8">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => navigate('/clients')} className="mr-4">
            <ArrowLeftIcon className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Client Details: {client.first_name} {client.last_name}
          </h1>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="flex items-center"><MailIcon className="mr-2 h-4 w-4 text-muted-foreground" /> Email: {client.email || '-'}</p>
            <p className="flex items-center"><PhoneIcon className="mr-2 h-4 w-4 text-muted-foreground" /> Phone: {client.phone || '-'}</p>
            <p className="flex items-center"><MapPinIcon className="mr-2 h-4 w-4 text-muted-foreground" /> Address: {client.address || '-'}</p>
            <p className="text-sm text-muted-foreground">Member since: {format(new Date(client.created_at), 'PPP')}</p>
          </CardContent>
        </Card>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Associated Notarizations</h2>
        {notarizations.length === 0 ? (
          <p className="text-center text-gray-600 dark:text-gray-400 mb-8">No notarizations found for this client.</p>
        ) : (
          <div className="overflow-x-auto mb-8">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notarizations.map((notarization) => (
                  <TableRow key={notarization.id}>
                    <TableCell className="font-medium">{notarization.document_type}</TableCell>
                    <TableCell>{format(new Date(notarization.notarization_date), 'PPP')}</TableCell>
                    <TableCell>{notarization.status}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{notarization.notes || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Associated Orders</h2>
        {orders.length === 0 ? (
          <p className="text-center text-gray-600 dark:text-gray-400">No orders found for this client.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service Type</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.service_type}</TableCell>
                    <TableCell>{format(new Date(order.order_date), 'PPP')}</TableCell>
                    <TableCell>{order.status}</TableCell>
                    <TableCell className="text-right">{order.total_amount ? `$${order.total_amount.toFixed(2)}` : '-'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{order.notes || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientDetailsPage;