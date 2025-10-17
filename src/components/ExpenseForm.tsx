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

const expenseFormSchema = z.object({
  account_id: z.string().optional().nullable(),
  amount: z.preprocess(
    (val) => Number(val),
    z.number().positive({ message: 'Amount must be positive.' })
  ),
  description: z.string().optional(),
  expense_date: z.date({ required_error: 'Expense date is required.' }),
  category: z.enum(['office_supplies', 'travel', 'education', 'marketing', 'other'], {
    required_error: 'Category is required.',
  }),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

interface ExpenseFormProps {
  onSuccess: () => void;
  initialData?: {
    id: string;
    account_id: string | null;
    amount: number;
    description: string | null;
    expense_date: string; // ISO string from DB
    category: 'office_supplies' | 'travel' | 'education' | 'marketing' | 'other';
  };
}

interface BankAccount {
  id: string;
  account_name: string;
  bank_name: string;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ onSuccess, initialData }) => {
  const { user } = useSession();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          expense_date: new Date(initialData.expense_date),
          account_id: initialData.account_id || '',
        }
      : {
          account_id: '',
          amount: 0,
          description: '',
          expense_date: new Date(),
          category: 'office_supplies',
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
        console.error('Error fetching bank accounts for expense form:', error.message);
        showError('Failed to load bank accounts.');
      } else {
        setBankAccounts(data || []);
      }
      setLoadingAccounts(false);
    };
    fetchBankAccounts();
  }, [user]);

  const onSubmit = async (values: ExpenseFormValues) => {
    if (!user) {
      showError('You must be logged in to perform this action.');
      return;
    }

    try {
      const expenseData = {
        user_id: user.id,
        account_id: values.account_id || null,
        amount: values.amount,
        description: values.description || null,
        expense_date: format(values.expense_date, 'yyyy-MM-dd'),
        category: values.category,
      };

      if (initialData) {
        // Update existing expense
        const { error } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', initialData.id)
          .eq('user_id', user.id);

        if (error) throw error;
        showSuccess('Expense updated successfully!');
      } else {
        // Add new expense
        const { error } = await supabase.from('expenses').insert(expenseData);

        if (error) throw error;
        showSuccess('Expense added successfully!');
      }
      onSuccess();
      form.reset();
    } catch (error: any) {
      console.error('Error saving expense:', error.message);
      showError(`Failed to save expense: ${error.message}`);
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
              <Select onValueChange={field.onChange} defaultValue={field.value || ''}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a bank account" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
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
                <Textarea placeholder="Brief description of expense" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="expense_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Expense Date</FormLabel>
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
                    <SelectValue placeholder="Select an expense category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="office_supplies">Office Supplies</SelectItem>
                  <SelectItem value="travel">Travel</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {initialData ? 'Update Expense' : 'Add Expense'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

export default ExpenseForm;