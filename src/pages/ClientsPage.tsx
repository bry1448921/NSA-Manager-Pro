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
import ClientForm from '@/components/ClientForm';
import { showSuccess, showError } from '@/utils/toast';
import { PencilIcon, Trash2Icon, PlusCircleIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
}

const ClientsPage: React.FC = () => {
  const { user } = useSession();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | undefined>(undefined);

  const fetchClients = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching clients:', error.message);
      showError('Failed to fetch clients.');
    } else {
      setClients(data || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingClient(undefined);
    fetchClients();
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setIsFormOpen(true);
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!user) {
      showError('You must be logged in to perform this action.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this client?')) return;

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId)
        .eq('user_id', user.id);

      if (error) throw error;
      showSuccess('Client deleted successfully!');
      fetchClients();
    } catch (error: any) {
      console.error('Error deleting client:', error.message);
      showError(`Failed to delete client: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-lg text-gray-700 dark:text-gray-300">Loading clients...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-4xl bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md mt-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Clients</h1>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingClient(undefined)}>
                <PlusCircleIcon className="mr-2 h-4 w-4" /> Add Client
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editingClient ? 'Edit Client' : 'Add New Client'}</DialogTitle>
              </DialogHeader>
              <ClientForm onSuccess={handleFormSuccess} initialData={editingClient} />
            </DialogContent>
          </Dialog>
        </div>

        {clients.length === 0 ? (
          <p className="text-center text-gray-600 dark:text-gray-400">No clients found. Add your first client!</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>First Name</TableHead>
                  <TableHead>Last Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.first_name}</TableCell>
                    <TableCell>{client.last_name}</TableCell>
                    <TableCell>{client.email || '-'}</TableCell>
                    <TableCell>{client.phone || '-'}</TableCell>
                    <TableCell>{client.address || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClient(client)}
                        className="mr-2"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClient(client.id)}
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

export default ClientsPage;