"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';

const CheckoutSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'pending' | 'ok' | 'error'>('pending');

  useEffect(() => {
    const run = async () => {
      const email = window.localStorage.getItem('signup_email') || '';
      const password = window.localStorage.getItem('signup_password') || '';

      if (!email || !password) {
        setStatus('error');
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setStatus('error');
        showError('Account created, but automatic sign-in failed. Please log in manually.');
        return;
      }

      setStatus('ok');
      showSuccess('Subscription confirmed and account created! Redirecting...');
      setTimeout(() => navigate('/dashboard'), 1200);
    };
    run();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Subscription Successful</CardTitle>
        </CardHeader>
        <CardContent>
          {status === 'pending' && (
            <p className="text-gray-700 dark:text-gray-300">
              Finalizing your account and signing you in...
            </p>
          )}
          {status === 'ok' && (
            <p className="text-emerald-600 font-medium">Success! Taking you to your dashboard.</p>
          )}
          {status === 'error' && (
            <div className="space-y-3">
              <p className="text-red-600">
                Your subscription was successful, but we couldn’t sign you in automatically.
              </p>
              <Button onClick={() => navigate('/login')}>Go to Login</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CheckoutSuccess;