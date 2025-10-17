"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/contexts/SessionContext";
import { showError, showSuccess } from "@/utils/toast";
import { format } from "date-fns";

type OrderRow = {
  id: string;
  client_id: string;
  order_date: string;
  service_type: string;
  status: string;
  total_amount: number | null;
  notes: string | null;
  rate_of_pay: number | null;
  scanbacks_required: boolean | null;
  shipping_service: string | null;
  tracking_number: string | null;
  completion_status: string | null;
  mileage: number | null;
};

type DocRow = {
  id: string;
  file_path: string;
  doc_type: "initial" | "signed" | "signer_id";
  uploaded_at: string;
};

const completionOptions = [
  "signed_successfully",
  "did_not_sign",
  "rescheduled",
  "partial",
  "other",
];

const expenseCategories = [
  "office_supplies",
  "travel",
  "education",
  "marketing",
  "other",
];

const OrderDetailsPage: React.FC = () => {
  const { user } = useSession();
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<OrderRow | null>(null);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [status, setStatus] = useState("pending");
  const [completionStatus, setCompletionStatus] = useState<string | undefined>(undefined);
  const [mileage, setMileage] = useState<string>("");
  const [signedDocs, setSignedDocs] = useState<FileList | null>(null);
  const [signerIds, setSignerIds] = useState<FileList | null>(null);

  // Quick expense form
  const [expenseAmount, setExpenseAmount] = useState<string>("");
  const [expenseCategory, setExpenseCategory] = useState<string>("other");
  const [expenseDescription, setExpenseDescription] = useState<string>("");

  const bucket = "order-documents";

  const load = async () => {
    if (!user || !orderId) return;

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("user_id", user.id)
      .single();
    if (error) {
      if (error.code === "PGRST116") {
        showError("Order not found.");
        navigate("/orders");
        return;
      }
      showError(error.message);
      return;
    }
    setOrder(data as OrderRow);
    setStatus((data as any).status || "pending");
    setCompletionStatus((data as any).completion_status || undefined);
    setMileage((data as any).mileage != null ? String((data as any).mileage) : "");

    const { data: docRows, error: docErr } = await supabase
      .from("order_documents")
      .select("id, file_path, doc_type, uploaded_at")
      .eq("order_id", orderId)
      .eq("user_id", user.id)
      .order("uploaded_at", { ascending: false });
    if (!docErr) setDocs((docRows || []) as DocRow[]);
  };

  useEffect(() => {
    load();
  }, [user, orderId]);

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  };

  const uploadBatch = async (files: FileList | null | undefined, type: "signed" | "signer_id") => {
    if (!files || !orderId || !user) return;
    const tasks = Array.from(files).map(async (file) => {
      const path = `${user.id}/${orderId}/${type}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { error: rowErr } = await supabase
        .from("order_documents")
        .insert({ user_id: user.id, order_id: orderId, file_path: path, doc_type: type });
      if (rowErr) throw rowErr;
    });
    await Promise.all(tasks);
  };

  const createInvoiceIfNeeded = async (ord: OrderRow) => {
    if (!user) return;
    const { data: existing, error: exErr } = await supabase
      .from("invoices")
      .select("id")
      .eq("user_id", user.id)
      .eq("order_id", ord.id)
      .maybeSingle();

    if (exErr) throw exErr;
    if (existing) return; // already exists

    const total = ord.rate_of_pay ?? ord.total_amount ?? 0;
    const { error: insErr } = await supabase
      .from("invoices")
      .insert({
        user_id: user.id,
        order_id: ord.id,
        total_amount: total,
        status: "draft",
      });
    if (insErr) throw insErr;
  };

  const saveUpdates = async () => {
    if (!user || !orderId) return;
    try {
      // update order status/completion/mileage
      const payload: any = {
        status,
        completion_status: completionStatus || null,
        mileage: mileage === "" ? null : Number(mileage),
      };
      const { error: updErr } = await supabase.from("orders").update(payload).eq("id", orderId).eq("user_id", user.id);
      if (updErr) throw updErr;

      // uploads
      await uploadBatch(signedDocs, "signed");
      await uploadBatch(signerIds, "signer_id");

      // auto-invoice if signed successfully
      if (completionStatus === "signed_successfully" && order) {
        await createInvoiceIfNeeded(order);
      }

      showSuccess("Order updated");
      setSignedDocs(null);
      setSignerIds(null);
      await load();
    } catch (e: any) {
      console.error(e);
      showError(e.message || "Failed to update order");
    }
  };

  const addExpense = async () => {
    if (!user || !orderId) return;
    try {
      const amountNum = Number(expenseAmount);
      if (!amountNum || amountNum <= 0) {
        showError("Enter a valid expense amount");
        return;
      }
      const { error } = await supabase.from("expenses").insert({
        user_id: user.id,
        account_id: null,
        amount: amountNum,
        description: expenseDescription || null,
        expense_date: format(new Date(), "yyyy-MM-dd"),
        category: expenseCategory as any,
        order_id: orderId,
      });
      if (error) throw error;
      showSuccess("Expense added");
      setExpenseAmount("");
      setExpenseCategory("other");
      setExpenseDescription("");
    } catch (e: any) {
      console.error(e);
      showError(e.message || "Failed to add expense");
    }
  };

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-lg text-gray-700 dark:text-gray-300">Loading order...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 bg-gray-100 dark:bg-gray-900">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center mb-4">
          <Button variant="ghost" onClick={() => navigate("/orders")} className="mr-2">
            Back
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Order Details</h1>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card className="bg-blue-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Status</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{status}</CardContent>
          </Card>
          <Card className="bg-purple-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Signing Date</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {order.order_date ? format(new Date(order.order_date), "PPP") : "-"}
            </CardContent>
          </Card>
          <Card className="bg-emerald-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Rate</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {order.rate_of_pay != null ? `$${order.rate_of_pay.toFixed(2)}` : order.total_amount != null ? `$${order.total_amount.toFixed(2)}` : "-"}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Update Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block mb-1 text-sm font-medium">Order Status</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium">Completion Status</label>
                <Select value={completionStatus || ""} onValueChange={setCompletionStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select completion" />
                  </SelectTrigger>
                  <SelectContent>
                    {completionOptions.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium">Mileage (mi)</label>
                <Input type="number" step="0.1" value={mileage} onChange={(e) => setMileage(e.target.value)} placeholder="0.0" />
              </div>
              <Button onClick={saveUpdates}>Save</Button>
              <p className="text-xs text-muted-foreground">
                When completion is “Signed Successfully,” a draft invoice will be created automatically.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upload Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block mb-1 text-sm font-medium">Signed Documents</label>
                <Input type="file" multiple onChange={(e) => setSignedDocs(e.target.files)} />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium">Signer IDs</label>
                <Input type="file" multiple onChange={(e) => setSignerIds(e.target.files)} />
              </div>
              <Button onClick={saveUpdates}>Upload & Save</Button>
              <div className="mt-4">
                <h3 className="font-medium mb-2">Existing Documents</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead>Link</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {docs.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>{d.doc_type}</TableCell>
                        <TableCell>{format(new Date(d.uploaded_at), "PPp")}</TableCell>
                        <TableCell>
                          <a className="text-blue-600 underline" href={getPublicUrl(d.file_path)} target="_blank" rel="noreferrer">
                            View
                          </a>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Add Order Expense</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-4">
              <div className="col-span-1">
                <label className="block mb-1 text-sm font-medium">Amount</label>
                <Input type="number" step="0.01" placeholder="0.00" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} />
              </div>
              <div className="col-span-1">
                <label className="block mb-1 text-sm font-medium">Category</label>
                <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c.replace(/_/g, " ").replace(/\b\w/g, (x) => x.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <label className="block mb-1 text-sm font-medium">Description</label>
                <Input placeholder="e.g., Shipping label, tolls, parking" value={expenseDescription} onChange={(e) => setExpenseDescription(e.target.value)} />
              </div>
              <div className="col-span-4">
                <Button onClick={addExpense}>Add Expense</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsPage;