"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2Icon, DownloadIcon, BanknoteIcon } from 'lucide-react';
import { exportToCsv } from '@/utils/report-exports';

interface BankAccount {
  id: string;
  account_name: string;
  bank_name: string;
  account_type: string;
  current_balance: number;
}

const BalanceSheetReport: React.FC = () => {
  const { user } = useSession();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBankAccounts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('account_name', { ascending: true });

      if (error) throw error;
      setBankAccounts(data || []);
    } catch (error: any) {
      console.error('Error fetching bank accounts for balance sheet:', error.message);
      showError('Failed to fetch bank accounts.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBankAccounts();
  }, [fetchBankAccounts]);

  const totalAssets = bankAccounts.reduce((sum, account) => sum + account.current_balance, 0);

  const handleExportCsv = () => {
    const reportData = [
      { Type: 'Total Assets', AccountName: '', BankName: '', AccountType: '', Balance: totalAssets.toFixed(2) },
      {}, // Empty row for separation
      { Type: 'Account Details', AccountName: '', BankName: '', AccountType: '', Balance: '' },
      ...bankAccounts.map(account => ({
        Type: 'Bank Account',
        AccountName: account.account_name,
        BankName: account.bank_name,
        AccountType: account.account_type.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase()),
        Balance: account.current_balance.toFixed(2),
      })),
    ];

    const headers = ['Type', 'AccountName', 'BankName', 'AccountType', 'Balance'];
    exportToCsv('balance_sheet_report.csv', reportData, headers);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
              <BanknoteIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalAssets.toFixed(2)}</div>
            </CardContent>
          </Card>

          <h3 className="text-xl font-semibold mt-8 mb-4">Bank Account Details</h3>
          {bankAccounts.length === 0 ? (
            <p className="text-center text-gray-600 dark:text-gray-400">No bank accounts found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Bank Name</TableHead>
                    <TableHead>Account Type</TableHead>
                    <TableHead className="text-right">Current Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bankAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">{account.account_name}</TableCell>
                      <TableCell>{account.bank_name}</TableCell>
                      <TableCell>{account.account_type.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())}</TableCell>
                      <TableCell className="text-right">${account.current_balance.toFixed(2)}</TableCell>
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

export default BalanceSheetReport;