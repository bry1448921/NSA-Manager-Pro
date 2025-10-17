"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSession } from '@/contexts/SessionContext';
import { useSubscription } from '@/hooks/use-subscription';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Loader2Icon } from 'lucide-react';

const ManageSubscriptionPage: React.FC = () => {
  const { user, isLoading: isUserLoading } = useSession();
  const { subscription, isLoading: isSubscriptionLoading, error: subscriptionError, refetchSubscription } = useSubscription();
  const navigate = useNavigate();
  const [isPortalLoading, setIsPortalLoading] = useState(false);

  useEffect(() => {
    if (!isUserLoading && !user) {
      navigate('/login');
    }
  }, [user, isUserLoading, navigate]);

  const handleManageBilling = async () => {
    if (!user) {
      showError("You must be logged in to manage billing.");
      navigate('/login');
      return;
    }

    setIsPortalLoading(true);
    try {
      // First, get the Stripe Customer ID
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('stripe_customer_id')
        .eq('id', user.id)
        .single();

      if (customerError || !customerData?.stripe_customer_id) {
        throw new Error("Could not find Stripe customer ID. Please ensure you have an active subscription.");
      }

      // Then, call an Edge Function to create a billing portal session
      const { data, error } = await supabase.functions.invoke('create-billing-portal-session', {
        body: { customer_id: customerData.stripe_customer_id },
      });

      if (error) throw error;

      if (data && data.url) {
        window.location.href = data.url;
      } else {
        showError("Failed to get billing portal URL.");
      }
    } catch (error: any) {
      console.error('Error managing billing:', error.message);
      showError(`Failed to manage billing: ${error.message}`);
    } finally {
      setIsPortalLoading(false);
    }
  };

  if (isUserLoading || isSubscriptionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <Loader2Icon className="h-8 w-8 animate-spin text-gray-700 dark:text-gray-300" />
        <p className="ml-2 text-lg text-gray-700 dark:text-gray-300">Loading subscription details...</p>
      </div>
    );
  }

  if (subscriptionError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-lg text-red-500">Error: {subscriptionError}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md mt-8">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-white">
          Manage Your Subscription
        </h1>

        {subscription ? (
          <Card>
            <CardHeader>
              <CardTitle>Current Subscription</CardTitle>
              <CardDescription>Details of your active plan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p><strong>Status:</strong> <span className="capitalize">{subscription.status}</span></p>
              <p><strong>Plan Price ID:</strong> {subscription.price_id}</p>
              <p><strong>Current Period Start:</strong> {format(new Date(subscription.current_period_start), 'PPP')}</p>
              <p><strong>Current Period End:</strong> {format(new Date(subscription.current_period_end), 'PPP')}</p>
              <p><strong>Cancel at Period End:</strong> {subscription.cancel_at_period_end ? 'Yes' : 'No'}</p>
              <Button
                onClick={handleManageBilling}
                disabled={isPortalLoading}
                className="w-full"
              >
                {isPortalLoading ? (
                  <>
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                    Redirecting...
                  </>
                ) : (
                  "Manage Billing & Plan"
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="text-center">
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
              You do not have an active subscription.
            </p>
            <Button onClick={() => navigate('/pricing')}>
              View Pricing Plans
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageSubscriptionPage;