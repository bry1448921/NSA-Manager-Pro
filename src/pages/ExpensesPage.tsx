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
import ExpenseForm from '@/components/ExpenseForm';
import { showSuccess, showError } from '@/utils/toast';
import { PencilIcon, Trash2Icon, PlusCircleIcon, ReceiptTextIcon } from 'lucide-react';
import { format } from 'date-fns';

interface Expense {
  id: string;
  account_id: string | null;
  amount: number;
  description: string | null;
  expense_date: string; // ISO string from DB
  category: 'office_supplies' | 'travel' | 'education' | 'marketing' | 'other';
  bank_accounts: {
    account_name: string;
    bank_name: string;
  } | null;
}

const ExpensesPage: React.FC = () => {
  const { user } = useSession();
  const [expenseRecords, setExpenseRecords] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);

  const fetchExpenseRecords = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('expenses')
      .select(`
        id,
        account_id,
        amount,
        description,
        expense_date,
        category,
        bank_accounts (account_name, bank_name)
      `)
      .eq('user_id', user.id)
      .order('expense_date', { ascending: false });

    if (error) {
      console.error('Error fetching expense records:', error.message);
      showError('Failed to fetch expense records.');
    } else {
      setExpenseRecords(data || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchExpenseRecords();
  }, [fetchExpenseRecords]);

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingExpense(undefined);
    fetchExpenseRecords();
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setIsFormOpen(true);
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!user) {
      showError('You must be logged in to perform this action.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this expense record?')) return;

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId)
        .eq('user_id', user.id);

      if (error) throw error;
      showSuccess('Expense record deleted successfully!');
      fetchExpenseRecords();
    } catch (error: any) {
      console.error('Error deleting expense record:', error.message);
      showError(`Failed to delete expense record: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-lg text-gray-700 dark:text-gray-300">Loading expense records...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-4xl bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md mt-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Expenses</h1>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingExpense(undefined)}>
                <PlusCircleIcon className="mr-2 h-4 w-4" /> Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editingExpense ? 'Edit Expense Record' : 'Add New Expense Record'}</DialogTitle>
              </DialogHeader>
              <ExpenseForm onSuccess={handleFormSuccess} initialData={editingExpense} />
            </DialogContent>
          </Dialog>
        </div>

        {expenseRecords.length === 0 ? (
          <p className="text-center text-gray-600 dark:text-gray-400">No expense records found. Add your first expense!</p>
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
                {expenseRecords.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{format(new Date(expense.expense_date), 'PPP')}</TableCell>
                    <TableCell>{expense.category.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{expense.description || '-'}</TableCell>
                    <TableCell>
                      {expense.bank_accounts ? `${expense.bank_accounts.account_name} (${expense.bank_accounts.bank_name})` : '-'}
                    </TableCell>
                    <TableCell className="text-right">${expense.amount.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditExpense(expense)}
                        className="mr-2"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteExpense(expense.id)}
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

export default ExpensesPage;