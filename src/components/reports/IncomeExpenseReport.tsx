"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { DateRangePicker } from '@/components/reports/DateRangePicker';
import { AccountFilter } from '@/components/reports/AccountFilter';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2Icon, DownloadIcon } from 'lucide-react';
import { exportToCsv } from '@/utils/report-exports';

interface IncomeRecord {
  id: string;
  amount: number;
  description: string | null;
  income_date: string;
  category: string;
  bank_accounts: { account_name: string; bank_name: string } | null;
}

interface ExpenseRecord {
  id: string;
  amount: number;
  description: string | null;
  expense_date: string;
  category: string;
  bank_accounts: { account_name: string; bank_name: string } | null;
}

const IncomeExpenseReport: React.FC = () => {
  const { user } = useSession();
  const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([]);
  const [expenseRecords, setExpenseRecords] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  });
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>(undefined);

  const fetchReportData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let incomeQuery = supabase
        .from('income')
        .select(`
          id,
          amount,
          description,
          income_date,
          category,
          bank_accounts (account_name, bank_name)
        `)
        .eq('user_id', user.id);

      let expenseQuery = supabase
        .from('expenses')
        .select(`
          id,
          amount,
          description,
          expense_date,
          category,
          bank_accounts (account_name, bank_name)
        `)
        .eq('user_id', user.id);

      if (dateRange?.from) {
        incomeQuery = incomeQuery.gte('income_date', format(dateRange.from, 'yyyy-MM-dd'));
        expenseQuery = expenseQuery.gte('expense_date', format(dateRange.from, 'yyyy-MM-dd'));
      }
      if (dateRange?.to) {
        incomeQuery = incomeQuery.lte('income_date', format(dateRange.to, 'yyyy-MM-dd'));
        expenseQuery = expenseQuery.lte('expense_date', format(dateRange.to, 'yyyy-MM-dd'));
      }
      if (selectedAccountId) {
        incomeQuery = incomeQuery.eq('account_id', selectedAccountId);
        expenseQuery = expenseQuery.eq('account_id', selectedAccountId);
      }

      const { data: incomeData, error: incomeError } = await incomeQuery.order('income_date', { ascending: false });
      const { data: expenseData, error: expenseError } = await expenseQuery.order('expense_date', { ascending: false });

      if (incomeError) throw incomeError;
      if (expenseError) throw expenseError;

      setIncomeRecords(incomeData || []);
      setExpenseRecords(expenseData || []);
    } catch (error: any) {
      console.error('Error fetching income/expense report data:', error.message);
      showError('Failed to fetch report data.');
    } finally {
      setLoading(false);
    }
  }, [user, dateRange, selectedAccountId]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const totalIncome = incomeRecords.reduce((sum, record) => sum + record.amount, 0);
  const totalExpenses = expenseRecords.reduce((sum, record) => sum + record.amount, 0);
  const netProfit = totalIncome - totalExpenses;

  const handleExportCsv = () => {
    const reportData = [
      { Type: 'Total Income', Amount: totalIncome.toFixed(2), Description: '', Date: '', Category: '', Account: '' },
      { Type: 'Total Expenses', Amount: totalExpenses.toFixed(2), Description: '', Date: '', Category: '', Account: '' },
      { Type: 'Net Profit', Amount: netProfit.toFixed(2), Description: '', Date: '', Category: '', Account: '' },
      {}, // Empty row for separation
      { Type: 'Income Details', Amount: '', Description: '', Date: '', Category: '', Account: '' },
      ...incomeRecords.map(i => ({
        Type: 'Income',
        Amount: i.amount.toFixed(2),
        Description: i.description || '',
        Date: format(new Date(i.income_date), 'yyyy-MM-dd'),
        Category: i.category.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase()),
        Account: i.bank_accounts ? `${i.bank_accounts.account_name} (${i.bank_accounts.bank_name})` : '-',
      })),
      {}, // Empty row for separation
      { Type: 'Expense Details', Amount: '', Description: '', Date: '', Category: '', Account: '' },
      ...expenseRecords.map(e => ({
        Type: 'Expense',
        Amount: e.amount.toFixed(2),
        Description: e.description || '',
        Date: format(new Date(e.expense_date), 'yyyy-MM-dd'),
        Category: e.category.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase()),
        Account: e.bank_accounts ? `${e.bank_accounts.account_name} (${e.bank_accounts.bank_name})` : '-',
      })),
    ];

    const headers = ['Type', 'Amount', 'Description', 'Date', 'Category', 'Account'];
    exportToCsv('income_expense_report.csv', reportData, headers);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 items-end">
        <DateRangePicker date={dateRange} setDate={setDateRange} />
        <AccountFilter selectedAccountId={selectedAccountId} onSelectAccount={setSelectedAccountId} />
        <Button onClick={handleExportCsv} disabled={loading}>
          <DownloadIcon className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2Icon className="h-8 w-8 animate-spin text-gray-700 dark:text-gray-300" />
          <p className="ml-2 text-lg text-gray-700 dark:text-gray-300">Loading report...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalIncome.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <ReceiptTextIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalExpenses.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${netProfit.toFixed(2)}
                </div>
              </CardContent>
            </Card>
          </div>

          <h3 className="text-xl font-semibold mt-8 mb-4">Income Details</h3>
          {incomeRecords.length === 0 ? (
            <p className="text-center text-gray-600 dark:text-gray-400">No income records found for the selected filters.</p>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <h3 className="text-xl font-semibold mt-8 mb-4">Expense Details</h3>
          {expenseRecords.length === 0 ? (
            <p className="text-center text-gray-600 dark:text-gray-400">No expense records found for the selected filters.</p>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default IncomeExpenseReport;