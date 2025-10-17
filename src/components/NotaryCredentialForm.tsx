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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { showSuccess, showError } from '@/utils/toast';

const notaryCredentialFormSchema = z.object({
  state: z.string().min(1, { message: 'State is required.' }),
  commission_number: z.string().min(1, { message: 'Commission number is required.' }),
  commission_expiration_date: z.date({ required_error: 'Commission expiration date is required.' }),
  bond_provider: z.string().optional().or(z.literal('')),
  bond_expiration_date: z.date().optional().nullable(),
  e_o_insurance_provider: z.string().optional().or(z.literal('')),
  e_o_insurance_expiration_date: z.date().optional().nullable(),
  e_o_insurance_amount: z.preprocess(
    (val) => (val === '' ? null : Number(val)),
    z.number().positive({ message: 'Amount must be positive.' }).optional().nullable()
  ),
});

type NotaryCredentialFormValues = z.infer<typeof notaryCredentialFormSchema>;

interface NotaryCredentialFormProps {
  onSuccess: () => void;
  initialData?: {
    id: string;
    state: string;
    commission_number: string;
    commission_expiration_date: string; // ISO string from DB
    bond_provider: string | null;
    bond_expiration_date: string | null; // ISO string from DB
    e_o_insurance_provider: string | null;
    e_o_insurance_expiration_date: string | null; // ISO string from DB
    e_o_insurance_amount: number | null;
  };
}

const NotaryCredentialForm: React.FC<NotaryCredentialFormProps> = ({ onSuccess, initialData }) => {
  const { user } = useSession();
  const form = useForm<NotaryCredentialFormValues>({
    resolver: zodResolver(notaryCredentialFormSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          commission_expiration_date: new Date(initialData.commission_expiration_date),
          bond_expiration_date: initialData.bond_expiration_date ? new Date(initialData.bond_expiration_date) : null,
          e_o_insurance_expiration_date: initialData.e_o_insurance_expiration_date ? new Date(initialData.e_o_insurance_expiration_date) : null,
          e_o_insurance_amount: initialData.e_o_insurance_amount || null,
        }
      : {
          state: '',
          commission_number: '',
          commission_expiration_date: new Date(),
          bond_provider: '',
          bond_expiration_date: null,
          e_o_insurance_provider: '',
          e_o_insurance_expiration_date: null,
          e_o_insurance_amount: null,
        },
  });

  const onSubmit = async (values: NotaryCredentialFormValues) => {
    if (!user) {
      showError('You must be logged in to perform this action.');
      return;
    }

    try {
      const credentialData = {
        user_id: user.id,
        state: values.state,
        commission_number: values.commission_number,
        commission_expiration_date: format(values.commission_expiration_date, 'yyyy-MM-dd'),
        bond_provider: values.bond_provider || null,
        bond_expiration_date: values.bond_expiration_date ? format(values.bond_expiration_date, 'yyyy-MM-dd') : null,
        e_o_insurance_provider: values.e_o_insurance_provider || null,
        e_o_insurance_expiration_date: values.e_o_insurance_expiration_date ? format(values.e_o_insurance_expiration_date, 'yyyy-MM-dd') : null,
        e_o_insurance_amount: values.e_o_insurance_amount || null,
      };

      if (initialData) {
        // Update existing credential
        const { error } = await supabase
          .from('notary_credentials')
          .update(credentialData)
          .eq('id', initialData.id)
          .eq('user_id', user.id);

        if (error) throw error;
        showSuccess('Notary credential updated successfully!');
      } else {
        // Add new credential
        const { error } = await supabase.from('notary_credentials').insert(credentialData);

        if (error) throw error;
        showSuccess('Notary credential added successfully!');
      }
      onSuccess();
      form.reset();
    } catch (error: any) {
      console.error('Error saving notary credential:', error.message);
      showError(`Failed to save notary credential: ${error.message}`);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="state"
          render={({ field }) => (
            <FormItem>
              <FormLabel>State</FormLabel>
              <FormControl>
                <Input placeholder="e.g., California" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="commission_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Commission Number</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 1234567" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="commission_expiration_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Commission Expiration Date</FormLabel>
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
          name="bond_provider"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bond Provider (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., ABC Surety" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="bond_expiration_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Bond Expiration Date (Optional)</FormLabel>
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
                    selected={field.value || undefined}
                    onSelect={field.onChange}
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
          name="e_o_insurance_provider"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E&O Insurance Provider (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., XYZ Insurance" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="e_o_insurance_expiration_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>E&O Insurance Expiration Date (Optional)</FormLabel>
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
                    selected={field.value || undefined}
                    onSelect={field.onChange}
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
          name="e_o_insurance_amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E&O Insurance Amount ($) (Optional)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...field}
                  value={field.value === null ? '' : field.value}
                  onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {initialData ? 'Update Credential' : 'Add Credential'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

export default NotaryCredentialForm;