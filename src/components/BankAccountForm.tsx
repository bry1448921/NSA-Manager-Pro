"use client";

import React from 'react';
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
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { showSuccess, showError } from '@/utils/toast';

const bankAccountFormSchema = z.object({
  account_name: z.string().min(1, { message: 'Account name is required.' }),
  bank_name: z.string().min(1, { message: 'Bank name is required.' }),
  account_type: z.enum(['checking', 'savings', 'credit_card', 'other'], {
    required_error: 'Account type is required.',
  }),
  current_balance: z.preprocess(
    (val) => (val === '' ? 0 : Number(val)),
    z.number().min(0, { message: 'Balance cannot be negative.' })
  ),
});

type BankAccountFormValues = z.infer<typeof bankAccountFormSchema>;

interface BankAccountFormProps {
  onSuccess: () => void;
  initialData?: {
    id: string;
    account_name: string;
    bank_name: string;
    account_type: 'checking' | 'savings' | 'credit_card' | 'other';
    current_balance: number;
  };
}

const BankAccountForm: React.FC<BankAccountFormProps> = ({ onSuccess, initialData }) => {
  const { user } = useSession();
  const form = useForm<BankAccountFormValues>({
    resolver: zodResolver(bankAccountFormSchema),
    defaultValues: initialData || {
      account_name: '',
      bank_name: '',
      account_type: 'checking',
      current_balance: 0,
    },
  });

  const onSubmit = async (values: BankAccountFormValues) => {
    if (!user) {
      showError('You must be logged in to perform this action.');
      return;
    }

    try {
      const accountData = {
        user_id: user.id,
        account_name: values.account_name,
        bank_name: values.bank_name,
        account_type: values.account_type,
        current_balance: values.current_balance,
      };

      if (initialData) {
        // Update existing bank account
        const { error } = await supabase
          .from('bank_accounts')
          .update(accountData)
          .eq('id', initialData.id)
          .eq('user_id', user.id);

        if (error) throw error;
        showSuccess('Bank account updated successfully!');
      } else {
        // Add new bank account
        const { error } = await supabase.from('bank_accounts').insert(accountData);

        if (error) throw error;
        showSuccess('Bank account added successfully!');
      }
      onSuccess();
      form.reset();
    } catch (error: any) {
      console.error('Error saving bank account:', error.message);
      showError(`Failed to save bank account: ${error.message}`);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="account_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account Name</FormLabel>
              <FormControl>
                <Input placeholder="My Checking Account" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="bank_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bank Name</FormLabel>
              <FormControl>
                <Input placeholder="Bank of America" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="account_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an account type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="checking">Checking</SelectItem>
                  <SelectItem value="savings">Savings</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="current_balance"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Current Balance ($)</FormLabel>
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
        <DialogFooter>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {initialData ? 'Update Account' : 'Add Account'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

export default BankAccountForm;