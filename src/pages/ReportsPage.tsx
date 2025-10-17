"use client";

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import IncomeExpenseReport from '@/components/reports/IncomeExpenseReport';
import BalanceSheetReport from '@/components/reports/BalanceSheetReport';

const ReportsPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-6xl bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md mt-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Financial Reports</h1>

        <Tabs defaultValue="income-expense" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="income-expense">Income & Expense</TabsTrigger>
            <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
          </TabsList>
          <TabsContent value="income-expense" className="mt-6">
            <IncomeExpenseReport />
          </TabsContent>
          <TabsContent value="balance-sheet" className="mt-6">
            <BalanceSheetReport />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ReportsPage;