"use client";

import React, { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { showError } from '@/utils/toast';

interface AccountFilterProps {
  selectedAccountId: string | undefined;
  onSelectAccount: (accountId: string | undefined) => void;
}

interface BankAccount {
  id: string;
  account_name: string;
  bank_name: string;
}

const AccountFilter: React.FC<AccountFilterProps> = ({ selectedAccountId, onSelectAccount }) => {
  const { user } = useSession();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBankAccounts = async () => {
      if (!user) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('id, account_name, bank_name')
        .eq('user_id', user.id)
        .order('account_name', { ascending: true });

      if (error) {
        console.error('Error fetching bank accounts for filter:', error.message);
        showError('Failed to load bank accounts for filter.');
      } else {
        setBankAccounts(data || []);
      }
      setLoading(false);
    };
    fetchBankAccounts();
  }, [user]);

  return (
    <div className="flex flex-col space-y-2">
      <Label htmlFor="account-filter">Filter by Account</Label>
      <Select
        value={selectedAccountId || ''}
        onValueChange={(value) => onSelectAccount(value === 'all' ? undefined : value)}
        disabled={loading}
      >
        <SelectTrigger id="account-filter" className="w-[200px]">
          <SelectValue placeholder="All Accounts" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Accounts</SelectItem>
          {bankAccounts.map((account) => (
            <SelectItem key={account.id} value={account.id}>
              {account.account_name} ({account.bank_name})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default AccountFilter;