"use client";

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { DialogFooter } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { showSuccess, showError } from '@/utils/toast';

const incomeFormSchema = z.object({
  account_id: z.string().optional().nullable(),
  amount: z.preprocess(
    (val) => Number(val),
    z.number().positive({ message: 'Amount must be positive.' })
  ),
  description: z.string().optional(),
  income_date: z.date({ required_error: 'Income date is required.' }),
  category: z.enum(['notary_fee', 'reimbursement', 'other'], {
    required_error: 'Category is required.',
  }),
});

type IncomeFormValues = z.infer<typeof incomeFormSchema>;

interface IncomeFormProps {
  onSuccess: () => void;
  initialData?: {
    id: string;
    account_id: string | null;
    amount: number;
    description: string | null;
    income_date: string; // ISO string from DB
    category: 'notary_fee' | 'reimbursement' | 'other';
  };
}

interface BankAccount {
  id: string;
  account_name: string;
  bank_name: string;
}

const IncomeForm: React.FC<IncomeFormProps> = ({ onSuccess, initialData }) => {
  const { user } = useSession();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  const form = useForm<IncomeFormValues>({
    resolver: zodResolver(incomeFormSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          income_date: new Date(initialData.income_date),
          account_id: initialData.account_id || '',
        }
      : {
          account_id: '',
          amount: 0,
          description: '',
          income_date: new Date(),
          category: 'notary_fee',
        },
  });

  useEffect(() => {
    const fetchBankAccounts = async () => {
      if (!user) return;
      setLoadingAccounts(true);
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('id, account_name, bank_name')
        .eq('user_id', user.id)
        .order('account_name', { ascending: true });

      if (error) {
        console.error('Error fetching bank accounts for income form:', error.message);
        showError('Failed to load bank accounts.');
      } else {
        setBankAccounts(data || []);
      }
      setLoadingAccounts(false);
    };
    fetchBankAccounts();
  }, [user]);

  const onSubmit = async (values: IncomeFormValues) => {
    if (!user) {
      showError('You must be logged in to perform this action.');
      return;
    }

    try {
      const incomeData = {
        user_id: user.id,
        account_id: values.account_id || null,
        amount: values.amount,
        description: values.description || null,
        income_date: format(values.income_date, 'yyyy-MM-dd'),
        category: values.category,
      };

      if (initialData) {
        // Update existing income
        const { error } = await supabase
          .from('income')
          .update(incomeData)
          .eq('id', initialData.id)
          .eq('user_id', user.id);

        if (error) throw error;
        showSuccess('Income updated successfully!');
      } else {
        // Add new income
        const { error } = await supabase.from('income').insert(incomeData);

        if (error) throw error;
        showSuccess('Income added successfully!');
      }
      onSuccess();
      form.reset();
    } catch (error: any) {
      console.error('Error saving income:', error.message);
      showError(`Failed to save income: ${error.message}`);
    }
  };

  if (loadingAccounts) {
    return <p className="text-center text-gray-600 dark:text-gray-400">Loading bank accounts...</p>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="account_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bank Account (Optional)</FormLabel>
              <Select onValueChange={(value) => field.onChange(value === 'none' ? '' : value)} defaultValue={field.value || ''}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a bank account" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {bankAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.account_name} ({account.bank_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount ($)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...field}
                  onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Brief description of income" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="income_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Income Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={'outline'}
                      className={cn(
                        'w-full pl-3 text-left font-normal',
                        !field.value && 'text-muted-foreground',
                      )}
                    >
                      {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an income category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="notary_fee">Notary Fee</SelectItem>
                  <SelectItem value="reimbursement">Reimbursement</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {initialData ? 'Update Income' : 'Add Income'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

export default IncomeForm;