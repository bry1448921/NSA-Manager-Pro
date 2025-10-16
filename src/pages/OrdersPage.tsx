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
import { MadeWithDyad } from '@/components/made-with-dyad';
import { format } from 'date-fns';

interface Order {
  id: string;
  client_id: string;
  order_date: string; // ISO string from DB
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
        client_id,
        clients (first_name, last_name)
      `)
      .eq('user_id', user.id)
      .order('order_date', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error.message);
      showError('Failed to fetch orders.');
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

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

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-4xl bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md mt-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Orders</h1>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingOrder(undefined)}>
                <PlusCircleIcon className="mr-2 h-4 w-4" /> Add Order
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editingOrder ? 'Edit Order' : 'Add New Order'}</DialogTitle>
              </DialogHeader>
              <OrderForm onSuccess={handleFormSuccess} initialData={editingOrder} />
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
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      {order.clients ? `${order.clients.first_name} ${order.clients.last_name}` : 'N/A'}
                    </TableCell>
                    <TableCell>{order.service_type}</TableCell>
                    <TableCell>{format(new Date(order.order_date), 'PPP')}</TableCell>
                    <TableCell>{order.status}</TableCell>
                    <TableCell>{order.total_amount ? `$${order.total_amount.toFixed(2)}` : '-'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{order.notes || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditOrder(order)}
                        className="mr-2"
                      >
                        <PencilIcon className="h-4 w-4" />
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
      <MadeWithDyad />
    </div>
  );
};

export default OrdersPage;