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
import NotarizationForm from '@/components/NotarizationForm';
import { showSuccess, showError } from '@/utils/toast';
import { PencilIcon, Trash2Icon, PlusCircleIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Notarization {
  id: string;
  client_id: string;
  document_type: string;
  notarization_date: string;
  status: string;
  notes: string | null;
  clients: {
    first_name: string;
    last_name: string;
  } | null;
}

const NotarizationsPage: React.FC = () => {
  const { user } = useSession();
  const [notarizations, setNotarizations] = useState<Notarization[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingNotarization, setEditingNotarization] = useState<Notarization | undefined>(undefined);

  const fetchNotarizations = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('notarizations')
      .select(`
        id,
        document_type,
        notarization_date,
        status,
        notes,
        client_id,
        clients (first_name, last_name)
      `)
      .eq('user_id', user.id)
      .order('notarization_date', { ascending: false });

    if (error) {
      console.error('Error fetching notarizations:', error.message);
      showError('Failed to fetch notarizations.');
    } else {
      setNotarizations(((data || []) as any[]).map((n: any) => {
        const clients = Array.isArray(n.clients) ? (n.clients[0] ?? null) : n.clients;
        return { ...n, clients } as Notarization;
      }));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchNotarizations();
  }, [fetchNotarizations]);

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingNotarization(undefined);
    fetchNotarizations();
  };

  const handleEditNotarization = (notarization: Notarization) => {
    setEditingNotarization(notarization);
    setIsFormOpen(true);
  };

  const handleDeleteNotarization = async (notarizationId: string) => {
    if (!user) {
      showError('You must be logged in to perform this action.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this notarization record?')) return;

    try {
      const { error } = await supabase
        .from('notarizations')
        .delete()
        .eq('id', notarizationId)
        .eq('user_id', user.id);

      if (error) throw error;
      showSuccess('Notarization deleted successfully!');
      fetchNotarizations();
    } catch (error: any) {
      console.error('Error deleting notarization:', error.message);
      showError(`Failed to delete notarization: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-lg text-gray-700 dark:text-gray-300">Loading notarizations...</p>
      </div>
    );
  }

  // Summary metrics
  const now = new Date();
  const isMTD = (d: Date) => d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  const isYTD = (d: Date) => d.getFullYear() === now.getFullYear();
  const mtd = notarizations.filter(n => isMTD(new Date(n.notarization_date))).length;
  const ytd = notarizations.filter(n => isYTD(new Date(n.notarization_date))).length;
  const active = notarizations.filter(n => n.status !== 'completed' && n.status !== 'cancelled').length;
  const completed = notarizations.filter(n => n.status === 'completed').length;

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-4xl bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md mt-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-rose-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Notarizations MTD</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{mtd}</CardContent>
          </Card>
          <Card className="bg-orange-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Notarizations YTD</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{ytd}</CardContent>
          </Card>
          <Card className="bg-amber-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Active</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{active}</CardContent>
          </Card>
          <Card className="bg-emerald-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Completed</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{completed}</CardContent>
          </Card>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notarizations</h1>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingNotarization(undefined)}>
                <PlusCircleIcon className="mr-2 h-4 w-4" /> Add Notarization
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editingNotarization ? 'Edit Notarization' : 'Add New Notarization'}</DialogTitle>
              </DialogHeader>
              <NotarizationForm onSuccess={handleFormSuccess} initialData={editingNotarization} />
            </DialogContent>
          </Dialog>
        </div>

        {notarizations.length === 0 ? (
          <p className="text-center text-gray-600 dark:text-gray-400">No notarizations found. Add your first notarization!</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Document Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notarizations.map((notarization) => (
                  <TableRow key={notarization.id}>
                    <TableCell className="font-medium">
                      {notarization.clients ? `${notarization.clients.first_name} ${notarization.clients.last_name}` : 'N/A'}
                    </TableCell>
                    <TableCell>{notarization.document_type}</TableCell>
                    <TableCell>{format(new Date(notarization.notarization_date), 'PPP')}</TableCell>
                    <TableCell>{notarization.status}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{notarization.notes || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditNotarization(notarization)}
                        className="mr-2"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteNotarization(notarization.id)}
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

export default NotarizationsPage;