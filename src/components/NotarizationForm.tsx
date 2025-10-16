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

const notarizationFormSchema = z.object({
  client_id: z.string().min(1, { message: 'Client is required.' }),
  document_type: z.string().min(1, { message: 'Document type is required.' }),
  notarization_date: z.date({ required_error: 'Notarization date is required.' }),
  status: z.string().min(1, { message: 'Status is required.' }),
  notes: z.string().optional(),
});

type NotarizationFormValues = z.infer<typeof notarizationFormSchema>;

interface NotarizationFormProps {
  onSuccess: () => void;
  initialData?: {
    id: string;
    client_id: string;
    document_type: string;
    notarization_date: string; // ISO string from DB
    status: string;
    notes?: string | null;
  };
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
}

const NotarizationForm: React.FC<NotarizationFormProps> = ({ onSuccess, initialData }) => {
  const { user } = useSession();
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

  const form = useForm<NotarizationFormValues>({
    resolver: zodResolver(notarizationFormSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          notarization_date: new Date(initialData.notarization_date),
        }
      : {
          client_id: '',
          document_type: '',
          notarization_date: new Date(),
          status: 'pending',
          notes: '',
        },
  });

  useEffect(() => {
    const fetchClients = async () => {
      if (!user) return;
      setLoadingClients(true);
      const { data, error } = await supabase
        .from('clients')
        .select('id, first_name, last_name')
        .eq('user_id', user.id)
        .order('first_name', { ascending: true });

      if (error) {
        console.error('Error fetching clients for form:', error.message);
        showError('Failed to load clients.');
      } else {
        setClients(data || []);
      }
      setLoadingClients(false);
    };
    fetchClients();
  }, [user]);

  const onSubmit = async (values: NotarizationFormValues) => {
    if (!user) {
      showError('You must be logged in to perform this action.');
      return;
    }

    try {
      const notarizationData = {
        user_id: user.id,
        client_id: values.client_id,
        document_type: values.document_type,
        notarization_date: format(values.notarization_date, 'yyyy-MM-dd'),
        status: values.status,
        notes: values.notes || null,
      };

      if (initialData) {
        // Update existing notarization
        const { error } = await supabase
          .from('notarizations')
          .update(notarizationData)
          .eq('id', initialData.id)
          .eq('user_id', user.id);

        if (error) throw error;
        showSuccess('Notarization updated successfully!');
      } else {
        // Add new notarization
        const { error } = await supabase.from('notarizations').insert(notarizationData);

        if (error) throw error;
        showSuccess('Notarization added successfully!');
      }
      onSuccess();
      form.reset();
    } catch (error: any) {
      console.error('Error saving notarization:', error.message);
      showError(`Failed to save notarization: ${error.message}`);
    }
  };

  if (loadingClients) {
    return <p className="text-center text-gray-600 dark:text-gray-400">Loading clients...</p>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="client_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Client</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.first_name} {client.last_name}
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
          name="document_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Document Type</FormLabel>
              <FormControl>
                <Input placeholder="Deed, Affidavit, Power of Attorney, etc." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notarization_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Notarization Date</FormLabel>
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
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Any additional notes..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {initialData ? 'Update Notarization' : 'Add Notarization'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

export default NotarizationForm;