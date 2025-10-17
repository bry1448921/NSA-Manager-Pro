"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';

export interface Subscription {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'incomplete_expired';
  price_id: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
}

interface UseSubscriptionResult {
  subscription: Subscription | null;
  isLoading: boolean;
  error: string | null;
  refetchSubscription: () => void;
}

export function useSubscription(): UseSubscriptionResult {
  const { user, isLoading: isUserLoading } = useSession();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = async () => {
    if (!user) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (dbError && dbError.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine
        throw dbError;
      }

      setSubscription(data || null);
    } catch (err: any) {
      console.error('Error fetching subscription:', err.message);
      setError(err.message);
      setSubscription(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isUserLoading) {
      fetchSubscription();
    }
  }, [user, isUserLoading]);

  return { subscription, isLoading, error, refetchSubscription: fetchSubscription };
}