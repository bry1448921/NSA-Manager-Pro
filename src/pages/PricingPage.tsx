"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { showError, showSuccess } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';

interface PriceOption {
  term: string;
  price: string;
  priceId: string;
}

interface PricingPlan {
  name: string;
  description: string;
  features: string[];
  prices: PriceOption[];
}

const pricingPlans: PricingPlan[] = [
  {
    name: "Getting Started",
    description: "Essential tools for new notaries.",
    features: [
      "Up to 50 clients",
      "Up to 100 notarizations/month",
      "Basic reporting",
    ],
    prices: [
      { term: "Monthly", price: "$10", priceId: "price_1RqPf62WGHZ3r9wpfEVaIfvd" },
      { term: "Every 3 Months", price: "$27", priceId: "price_1RqPrY2WGHZ3r9wpGxcv07sC" },
      { term: "Yearly", price: "$99", priceId: "price_1RqPnP2WGHZ3r9wpm1OOZWAv" },
    ],
  },
  {
    name: "Up and Running",
    description: "Grow your business with advanced features.",
    features: [
      "Unlimited clients",
      "Unlimited notarizations",
      "Advanced reporting",
      "Client portal access",
    ],
    prices: [
      { term: "Monthly", price: "$25", priceId: "price_1RqPdr2WGHZ3r9wpCuhUEuIg" },
      { term: "Every 3 Months", price: "$69", priceId: "price_1RqPqd2WGHZ3r9wp8lLNYgxR" },
      { term: "Yearly", price: "$249", priceId: "price_1RqPpY2WGHZ3r9wpJkMWis0q" },
    ],
  },
  {
    name: "Professional",
    description: "All-inclusive for established notary businesses.",
    features: [
      "All 'Up and Running' features",
      "Team management",
      "Priority support",
      "Custom integrations",
    ],
    prices: [
      { term: "Monthly", price: "$50", priceId: "price_1RqPgd2WGHZ3r9wprPSJumRT" },
      { term: "Every 3 Months", price: "$135", priceId: "price_1RqPsW2WGHZ3r9wpPaAPVCb7" },
      { term: "Yearly", price: "$499", priceId: "price_1RqPoY2WGHZ3r9wpd5cs8sot" },
    ],
  },
];

const PricingPage: React.FC = () => {
  const { user, isLoading: isSessionLoading } = useSession();
  const navigate = useNavigate();
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);

  const handleSubscribe = async (priceId: string) => {
    if (isSessionLoading) {
      showError("Please wait while your session loads.");
      return;
    }
    if (!user) {
      showError("You must be logged in to subscribe.");
      navigate('/login');
      return;
    }

    setLoadingPriceId(priceId);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { price_id: priceId },
      });

      if (error) throw error;

      if (data && data.url) {
        window.location.href = data.url;
      } else {
        showError("Failed to get checkout URL.");
      }
    } catch (error: any) {
      console.error('Error creating checkout session:', error.message);
      showError(`Failed to subscribe: ${error.message}`);
    } finally {
      setLoadingPriceId(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-6xl bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md mt-8">
        <h1 className="text-4xl font-bold text-center mb-4 text-gray-900 dark:text-white">
          Choose Your Plan
        </h1>
        <p className="text-xl text-center text-gray-600 dark:text-gray-300 mb-10">
          Select the perfect plan to manage your notary business.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pricingPlans.map((plan) => (
            <Card key={plan.name} className="flex flex-col justify-between">
              <CardHeader>
                <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <ul className="space-y-2 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center">
                      <CheckIcon className="mr-2 h-4 w-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="flex flex-col space-y-4">
                {plan.prices.map((priceOption) => (
                  <div key={priceOption.priceId} className="w-full">
                    <Button
                      className="w-full"
                      onClick={() => handleSubscribe(priceOption.priceId)}
                      disabled={loadingPriceId === priceOption.priceId || isSessionLoading}
                    >
                      {loadingPriceId === priceOption.priceId ? 'Processing...' : `Subscribe ${priceOption.term} - ${priceOption.price}`}
                    </Button>
                  </div>
                ))}
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PricingPage;