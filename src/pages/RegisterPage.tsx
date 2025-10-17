"use client";

import React, { useMemo, useState } from 'react';
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckIcon } from 'lucide-react';
import RecurringDisclosure from '@/components/RecurringDisclosure';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, Link } from 'react-router-dom';
import { showSuccess, showError } from '@/utils/toast';

const registerFormSchema = z.object({
  first_name: z.string().min(1, { message: 'First name is required.' }),
  last_name: z.string().min(1, { message: 'Last name is required.' }),
  company: z.string().optional().or(z.literal('')),
  phone_number: z.string().optional().or(z.literal('')),
  billing_street: z.string().min(1, { message: 'Street address is required.' }),
  billing_city: z.string().min(1, { message: 'City is required.' }),
  billing_state: z
    .string()
    .min(2, { message: 'State must be 2 characters.' })
    .max(2, { message: 'State must be 2 characters.' }),
  billing_zip: z
    .string()
    .regex(/^\d{5}(-\d{4})?$/, { message: 'ZIP must be 5 digits or ZIP+4 (12345 or 12345-6789).' }),
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

type RegisterFormValues = z.infer<typeof registerFormSchema>;

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

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [accountCreated, setAccountCreated] = useState(false);
  const [selectedPriceId, setSelectedPriceId] = useState<string | null>(null);
  const [agreeDisclosure, setAgreeDisclosure] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      company: '',
      phone_number: '',
      billing_street: '',
      billing_city: '',
      billing_state: '',
      billing_zip: '',
      email: '',
      password: '',
    },
  });

  const onRegisterNext = async (values: RegisterFormValues) => {
    setIsSubmitting(true);
    try {
      // Combine split billing fields into a single string for Supabase metadata/profile trigger
      const combinedBillingAddress = `${values.billing_street}, ${values.billing_city}, ${values.billing_state} ${values.billing_zip}`;

      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            first_name: values.first_name,
            last_name: values.last_name,
            company: values.company,
            phone_number: values.phone_number,
            billing_address: combinedBillingAddress,
          },
        },
      });

      if (error) throw error;

      if (data.user && data.session) {
        showSuccess('Account created! Choose a plan to get started.');
        setAccountCreated(true);
        setStep(2);
      } else if (data.user && !data.session) {
        showSuccess('Account created! Please confirm your email, then return to subscribe.');
        setAccountCreated(true);
        setStep(2);
      } else {
        showError('Unexpected registration state. Please try again.');
      }
    } catch (error: any) {
      console.error('Registration error:', error.message);
      showError(`Registration failed: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubscribe = async () => {
    if (!selectedPriceId) {
      showError("Please select a subscription option.");
      return;
    }
    if (!agreeDisclosure) {
      showError("You must agree to the recurring charge authorization.");
      return;
    }

    setIsCheckoutLoading(true);
    try {
      const successUrl = `${window.location.origin}/dashboard`;
      const cancelUrl = `${window.location.origin}/register`;

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { price_id: selectedPriceId, success_url: successUrl, cancel_url: cancelUrl },
      });

      if (error) throw error;

      if (data && data.url) {
        window.location.href = data.url;
      } else {
        showError("Failed to start checkout.");
      }
    } catch (error: any) {
      console.error('Error creating checkout session:', error.message);
      showError(`Failed to subscribe: ${error.message}`);
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  const header = useMemo(() => {
    if (step === 1) return "Create Your Account";
    return "Choose Your Subscription";
  }, [step]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-3xl bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
        <h2 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-white">
          {header}
        </h2>

        {step === 1 && (
          <>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onRegisterNext)} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Notary Services Inc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="123-456-7890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="billing_street"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Billing Street</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Main St" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="billing_city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Billing City</FormLabel>
                        <FormControl>
                          <Input placeholder="Anytown" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="billing_state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Billing State</FormLabel>
                        <FormControl>
                          <Input placeholder="CA" maxLength={2} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="billing_zip"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Billing ZIP</FormLabel>
                        <FormControl>
                          <Input placeholder="12345 or 12345-6789" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="john.doe@example.com" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Please wait...' : 'Next'}
                </Button>
              </form>
            </Form>

            <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <Link to="/login" className="text-indigo-600 hover:underline dark:text-indigo-400">
                Login
              </Link>
            </p>
          </>
        )}

        {step === 2 && (
          <>
            {!accountCreated && (
              <div className="mb-4 text-sm text-red-600">
                Please create your account first (Step 1). If you just registered, check your email to confirm before subscribing.
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {pricingPlans.map((plan) => (
                <Card key={plan.name} className={`flex flex-col justify-between ${selectedPriceId ? '' : ''}`}>
                  <CardHeader>
                    <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
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
                  <CardFooter className="flex flex-col space-y-2">
                    {plan.prices.map((priceOption) => (
                      <Button
                        key={priceOption.priceId}
                        variant={selectedPriceId === priceOption.priceId ? 'default' : 'outline'}
                        onClick={() => setSelectedPriceId(priceOption.priceId)}
                      >
                        {selectedPriceId === priceOption.priceId ? 'Selected' : `Select ${priceOption.term} - ${priceOption.price}`}
                      </Button>
                    ))}
                  </CardFooter>
                </Card>
              ))}
            </div>

            <div className="mt-6">
              <RecurringDisclosure agreed={agreeDisclosure} onAgreeChange={setAgreeDisclosure} />
            </div>

            <div className="mt-6 flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
              <Button
                onClick={handleSubscribe}
                disabled={!accountCreated || !selectedPriceId || !agreeDisclosure || isCheckoutLoading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isCheckoutLoading ? 'Redirecting...' : 'Subscribe & Pay'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RegisterPage;