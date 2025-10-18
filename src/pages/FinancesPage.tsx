"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/contexts/SessionContext";
import { supabase } from "@/integrations/supabase/client";
import IncomeForm from "@/components/IncomeForm";
import ExpenseForm from "@/components/ExpenseForm";
import BankAccountForm from "@/components/BankAccountForm";
import { showError, showSuccess } from "@/utils/toast";
import { format } from "date-fns";
import { DollarSignIcon, ReceiptTextIcon, PlusCircleIcon, BellIcon, CreditCardIcon, BuildingIcon } from "lucide-react";
import { toast } from "sonner";
import SectionHeader from "@/components/dashboard/SectionHeader";

interface BankAccount {
  id: string;
  account_name: string;
  bank_name: string;
  account_type: "checking" | "savings" | "credit_card" | "other";
  current_balance: number;
  created_at?: string;
}

interface Income {
  id: string;
  account_id: string | null;
  amount: number;
  description: string | null;
  income_date: string;
  category: "notary_fee" | "reimbursement" | "other";
  bank_accounts: {
    account_name: string;
    bank_name: string;
  } | null;
}

interface Expense {
  id: string;
  account_id: string | null;
  amount: number;
  description: string | null;
  expense_date: string;
  due_date: string | null;
  category: "office_supplies" | "travel" | "education" | "marketing" | "other";
  bank_accounts: {
    account_name: string;
    bank_name: string;
  } | null;
}

const FinancesPage: React.FC = () => {
  const { user } = useSession();

  // Bank accounts
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [isAccountFormOpen, setIsAccountFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | undefined>(undefined);

  // Income
  const [incomeRecords, setIncomeRecords] = useState<Income[]>([]);
  const [loadingIncome, setLoadingIncome] = useState(true);
  const [isIncomeFormOpen, setIsIncomeFormOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | undefined>(undefined);

  // Expenses
  const [expenseRecords, setExpenseRecords] = useState<Expense[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);

  const [remindersShown, setRemindersShown] = useState(false);

  const fetchBankAccounts = useCallback(async () => {
    if (!user) return;
    setLoadingAccounts(true);
    const { data, error } = await supabase
      .from("bank_accounts")
      .select("id, account_name, bank_name, account_type, current_balance, created_at")
      .eq("user_id", user.id)
      .order("account_name", { ascending: true });

    if (error) {
      console.error("Error fetching bank accounts:", error.message);
      showError("Failed to fetch bank accounts.");
      setAccounts([]);
    } else {
      setAccounts((data || []) as BankAccount[]);
    }
    setLoadingAccounts(false);
  }, [user]);

  const fetchIncome = useCallback(async () => {
    if (!user) return;
    setLoadingIncome(true);
    const { data, error } = await supabase
      .from("income")
      .select(`
        id,
        account_id,
        amount,
        description,
        income_date,
        category,
        bank_accounts (account_name, bank_name)
      `)
      .eq("user_id", user.id)
      .order("income_date", { ascending: false });

    if (error) {
      console.error("Error fetching income records:", error.message);
      showError("Failed to fetch income records.");
      setIncomeRecords([]);
    } else {
      setIncomeRecords(((data || []) as any[]).map((r: any) => {
        const bank_accounts = Array.isArray(r.bank_accounts) ? (r.bank_accounts[0] ?? null) : r.bank_accounts;
        return { ...r, bank_accounts } as Income;
      }));
    }
    setLoadingIncome(false);
  }, [user]);

  const fetchExpenses = useCallback(async () => {
    if (!user) return;
    setLoadingExpenses(true);
    const { data, error } = await supabase
      .from("expenses")
      .select(`
        id,
        account_id,
        amount,
        description,
        expense_date,
        due_date,
        category,
        bank_accounts (account_name, bank_name)
      `)
      .eq("user_id", user.id)
      .order("expense_date", { ascending: false });

    if (error) {
      console.error("Error fetching expense records:", error.message);
      showError("Failed to fetch expense records.");
      setExpenseRecords([]);
    } else {
      setExpenseRecords(((data || []) as any[]).map((r: any) => {
        const bank_accounts = Array.isArray(r.bank_accounts) ? (r.bank_accounts[0] ?? null) : r.bank_accounts;
        return { ...r, bank_accounts } as Expense;
      }));
    }
    setLoadingExpenses(false);
  }, [user]);

  useEffect(() => {
    fetchBankAccounts();
    fetchIncome();
    fetchExpenses();
  }, [fetchBankAccounts, fetchIncome, fetchExpenses]);

  // Automatic reminders for expenses due within next 15 days
  const upcomingExpenses = useMemo(() => {
    const today = new Date();
    return expenseRecords
      .filter((e) => {
        if (!e.due_date) return false;
        const due = new Date(e.due_date);
        const diffMs = due.getTime() - today.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        return diffDays <= 15 && diffDays >= 0;
      })
      .sort((a, b) => new Date(a.due_date || "").getTime() - new Date(b.due_date || "").getTime());
  }, [expenseRecords]);

  useEffect(() => {
    if (!remindersShown && upcomingExpenses.length > 0) {
      const first = upcomingExpenses[0];
      toast.info(`You have ${upcomingExpenses.length} bill(s) due within 15 days.`, { duration: 6000 });
      upcomingExpenses.slice(0, 3).forEach((e) => {
        toast.info(
          `Bill due ${format(new Date(e.due_date as string), "PPP")}: ${e.description || e.category.replace(/_/g, " ")}`,
          { duration: 6000 }
        );
      });
      setRemindersShown(true);
    }
  }, [upcomingExpenses, remindersShown]);

  const handleIncomeFormSuccess = () => {
    setIsIncomeFormOpen(false);
    setEditingIncome(undefined);
    fetchIncome();
    showSuccess("Income saved.");
  };

  const handleExpenseFormSuccess = () => {
    setIsExpenseFormOpen(false);
    setEditingExpense(undefined);
    fetchExpenses();
    showSuccess("Expense saved.");
  };

  const handleAccountFormSuccess = () => {
    setIsAccountFormOpen(false);
    setEditingAccount(undefined);
    fetchBankAccounts();
    showSuccess("Bank account saved.");
  };

  const totalIncome = incomeRecords.reduce((sum, record) => sum + record.amount, 0);
  const totalExpenses = expenseRecords.reduce((sum, record) => sum + record.amount, 0);
  const netProfit = totalIncome - totalExpenses;

  const totalAccounts = accounts.length;
  const totalBalance = accounts.reduce((sum, a) => sum + (a.current_balance || 0), 0);
  const checkingCount = accounts.filter((a) => a.account_type === "checking").length;
  const savingsCount = accounts.filter((a) => a.account_type === "savings").length;
  const creditCardCount = accounts.filter((a) => a.account_type === "credit_card").length;

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-6xl bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md mt-8 space-y-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Finances</h1>

        {/* Bank Accounts Section */}
        <SectionHeader
          title="Bank Accounts"
          right={
            <Dialog open={isAccountFormOpen} onOpenChange={setIsAccountFormOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingAccount(undefined)}>
                  <PlusCircleIcon className="mr-2 h-4 w-4" /> Add Account
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>{editingAccount ? "Edit Bank Account" : "Add New Bank Account"}</DialogTitle>
                </DialogHeader>
                <BankAccountForm onSuccess={handleAccountFormSuccess} initialData={editingAccount} />
              </DialogContent>
            </Dialog>
          }
        />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
              <BuildingIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalAccounts}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
              <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalBalance.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Checking / Savings</CardTitle>
              <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{checkingCount} / {savingsCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Credit Cards</CardTitle>
              <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{creditCardCount}</div>
            </CardContent>
          </Card>
        </div>

        {accounts.length > 0 && (
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="text-lg">Accounts List</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead>Bank</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="max-w-[240px] truncate">{a.account_name}</TableCell>
                        <TableCell className="max-w-[240px] truncate">{a.bank_name}</TableCell>
                        <TableCell className="capitalize">{a.account_type.replace(/_/g, " ")}</TableCell>
                        <TableCell className="text-right">${(a.current_balance || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingAccount(a);
                              setIsAccountFormOpen(true);
                            }}
                            className="mr-2"
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Totals Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Income</CardTitle>
              <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalIncome.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <ReceiptTextIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalExpenses.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
              <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                ${netProfit.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Bills */}
        {upcomingExpenses.length > 0 && (
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <BellIcon className="h-5 w-5" /> Upcoming Bills (next 15 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingExpenses.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell>{e.due_date ? format(new Date(e.due_date), "PPP") : "-"}</TableCell>
                        <TableCell>{e.category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</TableCell>
                        <TableCell className="max-w-[240px] truncate">{e.description || "-"}</TableCell>
                        <TableCell>${e.amount.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Income Section */}
        <SectionHeader
          title="Income"
          right={
            <Dialog open={isIncomeFormOpen} onOpenChange={setIsIncomeFormOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingIncome(undefined)}>
                  <PlusCircleIcon className="mr-2 h-4 w-4" /> Add Income
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>{editingIncome ? "Edit Income Record" : "Add New Income Record"}</DialogTitle>
                </DialogHeader>
                <IncomeForm onSuccess={handleIncomeFormSuccess} initialData={editingIncome} />
              </DialogContent>
            </Dialog>
          }
        />
        {loadingIncome ? (
          <p className="text-center text-gray-600 dark:text-gray-400">Loading income records...</p>
        ) : incomeRecords.length === 0 ? (
          <p className="text-center text-gray-600 dark:text-gray-400">No income records found. Add your first income!</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomeRecords.map((income) => (
                  <TableRow key={income.id}>
                    <TableCell>{format(new Date(income.income_date), "PPP")}</TableCell>
                    <TableCell>{income.category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{income.description || "-"}</TableCell>
                    <TableCell>
                      {income.bank_accounts ? `${income.bank_accounts.account_name} (${income.bank_accounts.bank_name})` : "-"}
                    </TableCell>
                    <TableCell className="text-right">${income.amount.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingIncome(income);
                          setIsIncomeFormOpen(true);
                        }}
                        className="mr-2"
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Expenses Section */}
        <SectionHeader
          title="Expenses"
          right={
            <Dialog open={isExpenseFormOpen} onOpenChange={setIsExpenseFormOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingExpense(undefined)}>
                  <PlusCircleIcon className="mr-2 h-4 w-4" /> Add Expense
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>{editingExpense ? "Edit Expense Record" : "Add New Expense Record"}</DialogTitle>
                </DialogHeader>
                <ExpenseForm onSuccess={handleExpenseFormSuccess} initialData={editingExpense} />
              </DialogContent>
            </Dialog>
          }
        />
        {loadingExpenses ? (
          <p className="text-center text-gray-600 dark:text-gray-400">Loading expense records...</p>
        ) : expenseRecords.length === 0 ? (
          <p className="text-center text-gray-600 dark:text-gray-400">No expense records found. Add your first expense!</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Expense Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenseRecords.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{format(new Date(expense.expense_date), "PPP")}</TableCell>
                    <TableCell>{expense.due_date ? format(new Date(expense.due_date), "PPP") : "-"}</TableCell>
                    <TableCell>{expense.category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{expense.description || "-"}</TableCell>
                    <TableCell>
                      {expense.bank_accounts ? `${expense.bank_accounts.account_name} (${expense.bank_accounts.bank_name})` : "-"}
                    </TableCell>
                    <TableCell className="text-right">${expense.amount.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingExpense(expense);
                          setIsExpenseFormOpen(true);
                        }}
                        className="mr-2"
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancesPage;