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
import IncomeForm from '@/components/IncomeForm';
import { showSuccess, showError } from '@/utils/toast';
import { PencilIcon, Trash2Icon, PlusCircleIcon, DollarSignIcon } from 'lucide-react';
import { format } from 'date-fns';

interface Income {
  id: string;
  account_id: string | null;
  amount: number;
  description: string | null;
  income_date: string; // ISO string from DB
  category: 'notary_fee' | 'reimbursement' | 'other';
  bank_accounts: {
    account_name: string;
    bank_name: string;
  } | null;
}

const IncomePage: React.FC = () => {
  const { user } = useSession();
  const [incomeRecords, setIncomeRecords] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | undefined>(undefined);

  const fetchIncomeRecords = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('income')
      .select(`
        id,
        account_id,
        amount,
        description,
        income_date,
        category,
        bank_accounts (account_name, bank_name)
      `)
      .eq('user_id', user.id)
      .order('income_date', { ascending: false });

    if (error) {
      console.error('Error fetching income records:', error.message);
      showError('Failed to fetch income records.');
    } else {
      setIncomeRecords(data || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchIncomeRecords();
  }, [fetchIncomeRecords]);

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingIncome(undefined);
    fetchIncomeRecords();
  };

  const handleEditIncome = (income: Income) => {
    setEditingIncome(income);
    setIsFormOpen(true);
  };

  const handleDeleteIncome = async (incomeId: string) => {
    if (!user) {
      showError('You must be logged in to perform this action.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this income record?')) return;

    try {
      const { error } = await supabase
        .from('income')
        .delete()
        .eq('id', incomeId)
        .eq('user_id', user.id);

      if (error) throw error;
      showSuccess('Income record deleted successfully!');
      fetchIncomeRecords();
    } catch (error: any) {
      console.error('Error deleting income record:', error.message);
      showError(`Failed to delete income record: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-lg text-gray-700 dark:text-gray-300">Loading income records...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-4xl bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md mt-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Income</h1>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingIncome(undefined)}>
                <PlusCircleIcon className="mr-2 h-4 w-4" /> Add Income
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editingIncome ? 'Edit Income Record' : 'Add New Income Record'}</DialogTitle>
              </DialogHeader>
              <IncomeForm onSuccess={handleFormSuccess} initialData={editingIncome} />
            </DialogContent>
          </Dialog>
        </div>

        {incomeRecords.length === 0 ? (
          <p className="text-center text-gray-600 dark:text-gray-400">No income records found. Add your first income!</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomeRecords.map((income) => (
                  <TableRow key={income.id}>
                    <TableCell>{format(new Date(income.income_date), 'PPP')}</TableCell>
                    <TableCell>{income.category.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{income.description || '-'}</TableCell>
                    <TableCell>
                      {income.bank_accounts ? `${income.bank_accounts.account_name} (${income.bank_accounts.bank_name})` : '-'}
                    </TableCell>
                    <TableCell className="text-right">${income.amount.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditIncome(income)}
                        className="mr-2"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteIncome(income.id)}
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

export default IncomePage;