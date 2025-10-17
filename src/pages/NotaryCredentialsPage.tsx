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
import NotaryCredentialForm from '@/components/NotaryCredentialForm';
import { showSuccess, showError } from '@/utils/toast';
import { PencilIcon, Trash2Icon, PlusCircleIcon, StampIcon } from 'lucide-react';
import { format } from 'date-fns';

interface NotaryCredential {
  id: string;
  state: string;
  commission_number: string;
  commission_expiration_date: string; // ISO string from DB
  bond_provider: string | null;
  bond_expiration_date: string | null; // ISO string from DB
  e_o_insurance_provider: string | null;
  e_o_insurance_expiration_date: string | null; // ISO string from DB
  e_o_insurance_amount: number | null;
}

const NotaryCredentialsPage: React.FC = () => {
  const { user } = useSession();
  const [credentials, setCredentials] = useState<NotaryCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<NotaryCredential | undefined>(undefined);

  const fetchCredentials = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('notary_credentials')
      .select('*')
      .eq('user_id', user.id)
      .order('commission_expiration_date', { ascending: true });

    if (error) {
      console.error('Error fetching notary credentials:', error.message);
      showError('Failed to fetch notary credentials.');
    } else {
      setCredentials(data || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingCredential(undefined);
    fetchCredentials();
  };

  const handleEditCredential = (credential: NotaryCredential) => {
    setEditingCredential(credential);
    setIsFormOpen(true);
  };

  const handleDeleteCredential = async (credentialId: string) => {
    if (!user) {
      showError('You must be logged in to perform this action.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this notary credential?')) return;

    try {
      const { error } = await supabase
        .from('notary_credentials')
        .delete()
        .eq('id', credentialId)
        .eq('user_id', user.id);

      if (error) throw error;
      showSuccess('Notary credential deleted successfully!');
      fetchCredentials();
    } catch (error: any) {
      console.error('Error deleting notary credential:', error.message);
      showError(`Failed to delete notary credential: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-lg text-gray-700 dark:text-gray-300">Loading notary credentials...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-6xl bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md mt-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notary Credentials</h1>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingCredential(undefined)}>
                <PlusCircleIcon className="mr-2 h-4 w-4" /> Add Credential
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{editingCredential ? 'Edit Notary Credential' : 'Add New Notary Credential'}</DialogTitle>
              </DialogHeader>
              <NotaryCredentialForm onSuccess={handleFormSuccess} initialData={editingCredential} />
            </DialogContent>
          </Dialog>
        </div>

        {credentials.length === 0 ? (
          <p className="text-center text-gray-600 dark:text-gray-400">No notary credentials found. Add your first credential!</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>State</TableHead>
                  <TableHead>Commission #</TableHead>
                  <TableHead>Commission Expiration</TableHead>
                  <TableHead>Bond Provider</TableHead>
                  <TableHead>Bond Expiration</TableHead>
                  <TableHead>E&O Provider</TableHead>
                  <TableHead>E&O Expiration</TableHead>
                  <TableHead className="text-right">E&O Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {credentials.map((credential) => (
                  <TableRow key={credential.id}>
                    <TableCell className="font-medium">{credential.state}</TableCell>
                    <TableCell>{credential.commission_number}</TableCell>
                    <TableCell>{format(new Date(credential.commission_expiration_date), 'PPP')}</TableCell>
                    <TableCell>{credential.bond_provider || '-'}</TableCell>
                    <TableCell>{credential.bond_expiration_date ? format(new Date(credential.bond_expiration_date), 'PPP') : '-'}</TableCell>
                    <TableCell>{credential.e_o_insurance_provider || '-'}</TableCell>
                    <TableCell>{credential.e_o_insurance_expiration_date ? format(new Date(credential.e_o_insurance_expiration_date), 'PPP') : '-'}</TableCell>
                    <TableCell className="text-right">{credential.e_o_insurance_amount ? `$${credential.e_o_insurance_amount.toFixed(2)}` : '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditCredential(credential)}
                        className="mr-2"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteCredential(credential.id)}
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

export default NotaryCredentialsPage;