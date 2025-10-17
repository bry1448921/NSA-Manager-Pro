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
import BankAccountForm from '@/components/BankAccountForm';
import { showSuccess, showError } from '@/utils/toast';
import { PencilIcon, Trash2Icon, PlusCircleIcon, BanknoteIcon } from 'lucide-react';

interface BankAccount {
  id: string;
  account_name: string;
  bank_name: string;
  account_type: 'checking' | 'savings' | 'credit_card' | 'other';
  current_balance: number;
}

const BankAccountsPage: React.FC = () => {
  const { user } = useSession();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | undefined>(undefined);

  const fetchBankAccounts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bank accounts:', error.message);
      showError('Failed to fetch bank accounts.');
    } else {
      setBankAccounts(data || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchBankAccounts();
  }, [fetchBankAccounts]);

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingAccount(undefined);
    fetchBankAccounts();
  };

  const handleEditAccount = (account: BankAccount) => {
    setEditingAccount(account);
    setIsFormOpen(true);
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!user) {
      showError('You must be logged in to perform this action.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this bank account?')) return;

    try {
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', accountId)
        .eq('user_id', user.id);

      if (error) throw error;
      showSuccess('Bank account deleted successfully!');
      fetchBankAccounts();
    } catch (error: any) {
      console.error('Error deleting bank account:', error.message);
      showError(`Failed to delete bank account: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-lg text-gray-700 dark:text-gray-300">Loading bank accounts...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-4xl bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md mt-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Bank Accounts</h1>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingAccount(undefined)}>
                <PlusCircleIcon className="mr-2 h-4 w-4" /> Add Account
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editingAccount ? 'Edit Bank Account' : 'Add New Bank Account'}</DialogTitle>
              </DialogHeader>
              <BankAccountForm onSuccess={handleFormSuccess} initialData={editingAccount} />
            </DialogContent>
          </Dialog>
        </div>

        {bankAccounts.length === 0 ? (
          <p className="text-center text-gray-600 dark:text-gray-400">No bank accounts found. Add your first bank account!</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Bank Name</TableHead>
                  <TableHead>Account Type</TableHead>
                  <TableHead className="text-right">Current Balance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bankAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.account_name}</TableCell>
                    <TableCell>{account.bank_name}</TableCell>
                    <TableCell>{account.account_type.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())}</TableCell>
                    <TableCell className="text-right">${account.current_balance.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditAccount(account)}
                        className="mr-2"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteAccount(account.id)}
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

export default BankAccountsPage;