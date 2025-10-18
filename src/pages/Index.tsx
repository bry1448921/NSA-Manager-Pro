"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "@/contexts/SessionContext";
import { supabase } from "@/integrations/supabase/client";
import SectionHeader from "@/components/dashboard/SectionHeader";
import SummaryCard from "@/components/dashboard/SummaryCard";
import { UsersIcon, FileTextIcon, CheckCircle2Icon, ClockIcon, CalendarCheck2Icon, ShieldCheckIcon, FileWarningIcon, DollarSignIcon, ReceiptTextIcon } from "lucide-react";
import { format, startOfMonth, startOfYear } from "date-fns";

const Index: React.FC = () => {
  const { user } = useSession();

  // Clients
  const [clientsTotal, setClientsTotal] = useState<number>(0);
  const [clientsNewMTD, setClientsNewMTD] = useState<number>(0);
  const [clientsNewYTD, setClientsNewYTD] = useState<number>(0);
  const [clientsActive, setClientsActive] = useState<number>(0);
  const [clientsInactive, setClientsInactive] = useState<number>(0);

  // Orders
  const [ordersMTD, setOrdersMTD] = useState<number>(0);
  const [ordersYTD, setOrdersYTD] = useState<number>(0);
  const [ordersOpen, setOrdersOpen] = useState<number>(0);
  const [ordersCompleted, setOrdersCompleted] = useState<number>(0);

  // Credentials
  const [commissionExp, setCommissionExp] = useState<string | null>(null);
  const [eoExp, setEoExp] = useState<string | null>(null);
  const [bondExp, setBondExp] = useState<string | null>(null);

  // Finances
  const [incomeMTD, setIncomeMTD] = useState<number>(0);
  const [incomeYTD, setIncomeYTD] = useState<number>(0);
  const [expensesMTD, setExpensesMTD] = useState<number>(0);
  const [expensesYTD, setExpensesYTD] = useState<number>(0);
  const [billsDue, setBillsDue] = useState<{ count: number; soonest: string | null }>({ count: 0, soonest: null });
  const [invoicesOutstanding, setInvoicesOutstanding] = useState<number>(0);
  const [ordersNotInvoiced, setOrdersNotInvoiced] = useState<number>(0);

  const startMonth = useMemo(() => startOfMonth(new Date()), []);
  const startYear = useMemo(() => startOfYear(new Date()), []);

  useEffect(() => {
    if (!user) return;

    // Clients totals and new counts
    const loadClients = async () => {
      const [{ count: total }, { count: mtd }, { count: ytd }, { data: clientList }] = await Promise.all([
        supabase.from("clients").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("clients").select("*", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", startMonth.toISOString()),
        supabase.from("clients").select("*", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", startYear.toISOString()),
        supabase.from("clients").select("id").eq("user_id", user.id)
      ]);

      setClientsTotal(total || 0);
      setClientsNewMTD(mtd || 0);
      setClientsNewYTD(ytd || 0);

      // Active/Inactive based on orders presence
      const { data: orderClients } = await supabase
        .from("orders")
        .select("client_id")
        .eq("user_id", user.id);

      const clientIds = (clientList || []).map((c: any) => c.id);
      const orderedClientIds = new Set((orderClients || []).map((o: any) => o.client_id));
      const activeCount = clientIds.filter((id) => orderedClientIds.has(id)).length;
      const inactiveCount = clientIds.length - activeCount;

      setClientsActive(activeCount);
      setClientsInactive(inactiveCount);
    };

    // Orders metrics
    const loadOrders = async () => {
      const [{ count: mtd }, { count: ytd }, { count: open }, { count: completed }] = await Promise.all([
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("user_id", user.id).gte("order_date", startMonth.toISOString()),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("user_id", user.id).gte("order_date", startYear.toISOString()),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("user_id", user.id).neq("status", "completed"),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("user_id", user.id).or("completion_status.eq.completed,status.eq.completed")
      ]);

      setOrdersMTD(mtd || 0);
      setOrdersYTD(ytd || 0);
      setOrdersOpen(open || 0);
      setOrdersCompleted(completed || 0);
    };

    // Credentials
    const loadCredentials = async () => {
      const { data } = await supabase
        .from("notary_credentials")
        .select("commission_expiration_date, bond_expiration_date, e_o_insurance_expiration_date")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      const latest = (data || [])[0] || null;
      setCommissionExp(latest?.commission_expiration_date || null);
      setBondExp(latest?.bond_expiration_date || null);
      setEoExp(latest?.e_o_insurance_expiration_date || null);
    };

    // Finances: income/expenses MTD/YTD, bills due, invoices outstanding, orders not invoiced
    const loadFinances = async () => {
      const [{ data: incomeM }, { data: incomeY }, { data: expM }, { data: expY }, { data: expensesAll }, { data: invoicesAll }, { data: ordersAll }] = await Promise.all([
        supabase.from("income").select("amount").eq("user_id", user.id).gte("income_date", startMonth.toISOString()),
        supabase.from("income").select("amount").eq("user_id", user.id).gte("income_date", startYear.toISOString()),
        supabase.from("expenses").select("amount").eq("user_id", user.id).gte("expense_date", startMonth.toISOString()),
        supabase.from("expenses").select("amount").eq("user_id", user.id).gte("expense_date", startYear.toISOString()),
        supabase.from("expenses").select("due_date, description").eq("user_id", user.id),
        supabase.from("invoices").select("id, status, order_id").eq("user_id", user.id),
        supabase.from("orders").select("id").eq("user_id", user.id)
      ]);

      const sum = (arr?: { amount: number }[]) => (arr || []).reduce((s, r) => s + (Number(r.amount) || 0), 0);
      setIncomeMTD(sum(incomeM as any));
      setIncomeYTD(sum(incomeY as any));
      setExpensesMTD(sum(expM as any));
      setExpensesYTD(sum(expY as any));

      const upcoming = (expensesAll || [])
        .filter((e: any) => !!e.due_date)
        .map((e: any) => ({ due: new Date(e.due_date), description: e.description }))
        .filter((e: any) => {
          const diffDays = Math.ceil((e.due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          return diffDays >= 0 && diffDays <= 15;
        })
        .sort((a: any, b: any) => a.due.getTime() - b.due.getTime());

      setBillsDue({
        count: upcoming.length,
        soonest: upcoming.length > 0 ? format(upcoming[0].due, "PPP") : null
      });

      const outstanding = (invoicesAll || []).filter((inv: any) => inv.status !== "paid");
      setInvoicesOutstanding(outstanding.length);

      const invoicedOrderIds = new Set((invoicesAll || []).map((inv: any) => inv.order_id));
      const notInvoicedCount = (ordersAll || []).filter((o: any) => !invoicedOrderIds.has(o.id)).length;
      setOrdersNotInvoiced(notInvoicedCount);
    };

    loadClients();
    loadOrders();
    loadCredentials();
    loadFinances();
  }, [user, startMonth, startYear]);

  return (
    <div className="flex flex-col items-center p-4">
      <div className="w-full max-w-6xl bg-white dark:bg-gray-800 p-4 md:p-8 rounded-lg shadow-md mt-8 space-y-8">
        {/* Clients Section */}
        <SectionHeader title="Clients" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <SummaryCard title="Total Clients" value={clientsTotal} icon={<UsersIcon className="h-4 w-4 text-muted-foreground" />} />
          <SummaryCard title="Active Clients" value={clientsActive} icon={<CheckCircle2Icon className="h-4 w-4 text-muted-foreground" />} />
          <SummaryCard title="Inactive Clients" value={clientsInactive} icon={<ClockIcon className="h-4 w-4 text-muted-foreground" />} />
          <SummaryCard title="New Clients (MTD/YTD)" value={`${clientsNewMTD} / ${clientsNewYTD}`} icon={<CalendarCheck2Icon className="h-4 w-4 text-muted-foreground" />} />
        </div>

        {/* Orders Section */}
        <SectionHeader title="Orders" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <SummaryCard title="Orders MTD" value={ordersMTD} icon={<FileTextIcon className="h-4 w-4 text-muted-foreground" />} />
          <SummaryCard title="Orders YTD" value={ordersYTD} icon={<FileTextIcon className="h-4 w-4 text-muted-foreground" />} />
          <SummaryCard title="Open Orders" value={ordersOpen} icon={<FileWarningIcon className="h-4 w-4 text-muted-foreground" />} />
          <SummaryCard title="Completed Orders" value={ordersCompleted} icon={<CheckCircle2Icon className="h-4 w-4 text-muted-foreground" />} />
        </div>

        {/* Credentials Section */}
        <SectionHeader title="Credentials" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <SummaryCard
            title="Notary Commission"
            value={commissionExp ? format(new Date(commissionExp), "PPP") : "Not set"}
            icon={<ShieldCheckIcon className="h-4 w-4 text-muted-foreground" />}
          />
          <SummaryCard
            title="E&O Insurance Policy"
            value={eoExp ? format(new Date(eoExp), "PPP") : "Not set"}
            icon={<ShieldCheckIcon className="h-4 w-4 text-muted-foreground" />}
          />
          <SummaryCard
            title="Notary Bond"
            value={bondExp ? format(new Date(bondExp), "PPP") : "Not set"}
            icon={<ShieldCheckIcon className="h-4 w-4 text-muted-foreground" />}
          />
        </div>

        {/* Finances Section */}
        <SectionHeader title="Finances" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <SummaryCard title="Income MTD" value={`$${incomeMTD.toFixed(2)}`} icon={<DollarSignIcon className="h-4 w-4 text-muted-foreground" />} />
          <SummaryCard title="Income YTD" value={`$${incomeYTD.toFixed(2)}`} icon={<DollarSignIcon className="h-4 w-4 text-muted-foreground" />} />
          <SummaryCard title="Expenses MTD" value={`$${expensesMTD.toFixed(2)}`} icon={<ReceiptTextIcon className="h-4 w-4 text-muted-foreground" />} />
          <SummaryCard title="Expenses YTD" value={`$${expensesYTD.toFixed(2)}`} icon={<ReceiptTextIcon className="h-4 w-4 text-muted-foreground" />} />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <SummaryCard title="Bills Due (next 15 days)" value={billsDue.count} description={billsDue.soonest ? `Soonest: ${billsDue.soonest}` : undefined} icon={<ReceiptTextIcon className="h-4 w-4 text-muted-foreground" />} />
          <SummaryCard title="Outstanding Invoices" value={invoicesOutstanding} icon={<FileTextIcon className="h-4 w-4 text-muted-foreground" />} />
          <SummaryCard title="Orders Not Invoiced" value={ordersNotInvoiced} icon={<FileWarningIcon className="h-4 w-4 text-muted-foreground" />} />
        </div>
      </div>
    </div>
  );
};

export default Index;