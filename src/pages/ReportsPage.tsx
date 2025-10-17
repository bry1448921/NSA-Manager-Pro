"use client";

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import IncomeExpenseReport from '@/components/reports/IncomeExpenseReport';
import BalanceSheetReport from '@/components/reports/BalanceSheetReport';
import CustomReportForm from '@/components/reports/CustomReportForm'; // New import

const ReportsPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-6xl bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md mt-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Financial Reports</h1>

        <Tabs defaultValue="income-expense" className="w-full">
          <TabsList className="grid w-full grid-cols-3"> {/* Changed to 3 columns */}
            <TabsTrigger value="income-expense">Income & Expense</TabsTrigger>
            <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
            <TabsTrigger value="custom-reports">Custom Reports</TabsTrigger> {/* New Tab Trigger */}
          </TabsList>
          <TabsContent value="income-expense" className="mt-6">
            <IncomeExpenseReport />
          </TabsContent>
          <TabsContent value="balance-sheet" className="mt-6">
            <BalanceSheetReport />
          </TabsContent>
          <TabsContent value="custom-reports" className="mt-6"> {/* New Tab Content */}
            <CustomReportForm />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ReportsPage;