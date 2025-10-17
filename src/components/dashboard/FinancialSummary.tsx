"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2Icon, DollarSignIcon, ReceiptTextIcon } from 'lucide-react';

interface FinancialRecord {
  category: string;
  amount: number;
}

const FinancialSummary: React.FC = () => {
  const { user } = useSession();
  const [incomeByCategory, setIncomeByCategory] = useState<FinancialRecord[]>([]);
  const [expensesByCategory, setExpensesByCategory] = useState<FinancialRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFinancialSummary = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch income by category
      const { data: incomeData, error: incomeError } = await supabase
        .from('income')
        .select('category, amount')
        .eq('user_id', user.id);

      if (incomeError) throw incomeError;

      const incomeMap = new Map<string, number>();
      incomeData.forEach(record => {
        const category = record.category.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
        incomeMap.set(category, (incomeMap.get(category) || 0) + record.amount);
      });
      setIncomeByCategory(Array.from(incomeMap, ([category, amount]) => ({ category, amount })));

      // Fetch expenses by category
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .select('category, amount')
        .eq('user_id', user.id);

      if (expenseError) throw expenseError;

      const expenseMap = new Map<string, number>();
      expenseData.forEach(record => {
        const category = record.category.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
        expenseMap.set(category, (expenseMap.get(category) || 0) + record.amount);
      });
      setExpensesByCategory(Array.from(expenseMap, ([category, amount]) => ({ category, amount })));

    } catch (error: any) {
      console.error('Error fetching financial summary:', error.message);
      showError('Failed to load financial summary.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFinancialSummary();
  }, [fetchFinancialSummary]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2Icon className="h-8 w-8 animate-spin text-gray-700 dark:text-gray-300" />
        <p className="ml-2 text-lg text-gray-700 dark:text-gray-300">Loading financial summary...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-medium">Income by Category</CardTitle>
          <DollarSignIcon className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {incomeByCategory.length === 0 ? (
            <p className="text-center text-gray-600 dark:text-gray-400">No income records.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomeByCategory.map((record, index) => (
                  <TableRow key={index}>
                    <TableCell>{record.category}</TableCell>
                    <TableCell className="text-right">${record.amount.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-medium">Expenses by Category</CardTitle>
          <ReceiptTextIcon className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {expensesByCategory.length === 0 ? (
            <p className="text-center text-gray-600 dark:text-gray-400">No expense records.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expensesByCategory.map((record, index) => (
                  <TableRow key={index}>
                    <TableCell>{record.category}</TableCell>
                    <TableCell className="text-right">${record.amount.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialSummary;