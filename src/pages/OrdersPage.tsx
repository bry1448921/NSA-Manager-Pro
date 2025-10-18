"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import OrderForm from '@/components/OrderForm';
import { showSuccess, showError } from '@/utils/toast';
import { PencilIcon, Trash2Icon, PlusCircleIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import OrderWizard from '@/components/orders/OrderWizard';

interface Order {
  id: string;
  client_id: string;
  order_date: string;
  service_type: string;
  status: string;
  total_amount: number | null;
  notes: string | null;
  clients: {
    first_name: string;
    last_name: string;
  } | null;
}

const OrdersPage: React.FC = () => {
  const { user } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | undefined>(undefined);
  const [clientsForWizard, setClientsForWizard] = useState<{id:string; name:string}[]>([]);
  const [invoicedOrderIds, setInvoicedOrderIds] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_date,
        service_type,
        status,
        total_amount,
        notes,
        client_id
      `)
      .eq('user_id', user.id)
      .order('order_date', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error.message);
      showError('Failed to fetch orders.');
    } else {
      setOrders((data || []) as Order[]);
    }
    setLoading(false);
  }, [user]);

  const fetchClientsForWizard = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('clients')
      .select('id, first_name, last_name')
      .eq('user_id', user.id)
      .order('first_name', { ascending: true });
    if (!error) {
      setClientsForWizard((data || []).map((c:any) => ({ id: c.id, name: `${c.first_name} ${c.last_name}` })));
    }
  }, [user]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const fetchInvoices = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('invoices')
      .select('order_id')
      .eq('user_id', user.id);
    if (!error && data) {
      setInvoicedOrderIds(new Set((data as any[]).map(r => r.order_id)));
    }
  }, [user]);

  useEffect(() => {
    fetchClientsForWizard();
  }, [fetchClientsForWizard]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingOrder(undefined);
    fetchOrders();
  };

  const handleEditOrder = (order: Order) => {
    setEditingOrder(order);
    setIsFormOpen(true);
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!user) {
      showError('You must be logged in to perform this action.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this order?')) return;

    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId)
        .eq('user_id', user.id);

      if (error) throw error;
      showSuccess('Order deleted successfully!');
      fetchOrders();
    } catch (error: any) {
      console.error('Error deleting order:', error.message);
      showError(`Failed to delete order: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-lg text-gray-700 dark:text-gray-300">Loading orders...</p>
      </div>
    );
  }

  const now = new Date();
  const getDate = (iso: string) => new Date(iso);
  const isMTD = (d: Date) => d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  const isYTD = (d: Date) => d.getFullYear() === now.getFullYear();
  const mtdOrders = orders.filter(o => isMTD(getDate(o.order_date))).length;
  const ytdOrders = orders.filter(o => isYTD(getDate(o.order_date))).length;
  const activeOrders = orders.filter(o => ['pending','in_progress'].includes(o.status)).length;
  const completedOrders = orders.filter(o => o.status === 'completed').length;
  const invoiced = orders.filter(o => invoicedOrderIds.has(o.id)).length;
  const notInvoiced = orders.length - invoiced;

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-4xl bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md mt-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <Card className="bg-blue-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Orders MTD</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{mtdOrders}</CardContent>
          </Card>
          <Card className="bg-indigo-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Orders YTD</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{ytdOrders}</CardContent>
          </Card>
          <Card className="bg-amber-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Active Orders</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{activeOrders}</CardContent>
          </Card>
          <Card className="bg-emerald-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Completed Orders</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{completedOrders}</CardContent>
          </Card>
          <Card className="bg-rose-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Not Invoiced</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{notInvoiced}</CardContent>
          </Card>
          <Card className="bg-violet-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Invoiced</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{invoiced}</CardContent>
          </Card>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Orders</h1>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingOrder(undefined)}>
                <PlusCircleIcon className="mr-2 h-4 w-4" /> Add Order
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{editingOrder ? 'Edit Order' : 'Add New Order (Wizard)'}</DialogTitle>
              </DialogHeader>
              {editingOrder ? (
                <OrderForm onSuccess={handleFormSuccess} initialData={editingOrder} />
              ) : (
                <OrderWizard onSuccess={handleFormSuccess} clientOptions={clientsForWizard} />
              )}
            </DialogContent>
          </Dialog>
        </div>

        {orders.length === 0 ? (
          <p className="text-center text-gray-600 dark:text-gray-400">No orders found. Add your first order!</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Service Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow
                    key={order.id}
                    onClick={() => navigate(`/orders/${order.id}`)}
                    className="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/30"
                  >
                    <TableCell className="font-medium">
                      {clientsForWizard.find((c) => c.id === order.client_id)?.name || 'N/A'}
                    </TableCell>
                    <TableCell>{order.service_type}</TableCell>
                    <TableCell>{format(new Date(order.order_date), 'PPP')}</TableCell>
                    <TableCell>{order.status}</TableCell>
                    <TableCell>{order.total_amount ? `$${order.total_amount.toFixed(2)}` : '-'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{order.notes || '-'}</TableCell>
                    <TableCell
                      className="text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditOrder(order)}
                        className="mr-2"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/orders/${order.id}`)}
                        className="mr-2"
                      >
                        View
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteOrder(order.id)}
                      >
                        <Trash2Icon className="h-4 w-4" />
                      </Button>
                    </TableCell>
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

export default OrdersPage;