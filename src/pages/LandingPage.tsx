"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircleIcon, UsersIcon, FileTextIcon, DollarSignIcon } from 'lucide-react';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 text-gray-900 dark:text-white">
      {/* Header with Login/Register */}
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">NSA Manager Pro</h1>
        <nav className="space-x-4">
          <Button asChild variant="outline">
            <Link to="/login">Login</Link>
          </Button>
          <Button asChild>
            <Link to="/register">Register</Link>
          </Button>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="py-20 text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-5xl font-extrabold mb-6 leading-tight">
            Streamline Your Notary Business
          </h2>
          <p className="text-xl text-gray-700 dark:text-gray-300 mb-10 max-w-3xl mx-auto">
            Effortlessly manage clients, notarizations, orders, and finances all in one place.
            Focus on your work, we'll handle the organization.
          </p>
          <Button asChild size="lg" className="text-lg px-8 py-6">
            <Link to="/pricing">Choose Your Plan</Link>
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <h3 className="text-4xl font-bold text-center mb-12">Key Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="text-center p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <UsersIcon className="h-12 w-12 text-indigo-500 mx-auto mb-4" />
                <CardTitle className="text-xl font-semibold">Client Management</CardTitle>
              </CardHeader>
              <CardContent>
                Keep track of all your clients, their contact information, and history.
              </CardContent>
            </Card>
            <Card className="text-center p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <FileTextIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <CardTitle className="text-xl font-semibold">Notarization Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                Log every notarization, document type, date, and status with ease.
              </CardContent>
            </Card>
            <Card className="text-center p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <DollarSignIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <CardTitle className="text-xl font-semibold">Financial Overview</CardTitle>
              </CardHeader>
              <CardContent>
                Monitor your income and expenses to understand your business's financial health.
              </CardContent>
            </Card>
            <Card className="text-center p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <CheckCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <CardTitle className="text-xl font-semibold">Credential Management</CardTitle>
              </CardHeader>
              <CardContent>
                Store and track your notary commission and E&O insurance details.
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 text-center bg-indigo-600 dark:bg-indigo-800 text-white">
        <div className="container mx-auto px-4">
          <h3 className="text-4xl font-bold mb-6">Ready to Get Organized?</h3>
          <p className="text-xl mb-10 max-w-3xl mx-auto">
            Join thousands of notaries who are simplifying their daily operations.
          </p>
          <Button asChild size="lg" variant="secondary" className="text-lg px-8 py-6">
            <Link to="/pricing">View Our Plans</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-gray-600 dark:text-gray-400">
        <p>&copy; {new Date().getFullYear()} NSA Manager Pro. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;