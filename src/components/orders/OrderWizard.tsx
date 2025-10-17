"use client";

import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, setHours, setMinutes } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/contexts/SessionContext";
import { showError, showSuccess } from "@/utils/toast";

const signerSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
});

const schema = z.object({
  client_id: z.string().min(1, "Client is required"),
  // Step 1
  date: z.date({ required_error: "Signing date is required" }),
  time: z.string().min(1, "Signing time is required"), // "HH:MM"
  location: z.string().min(1, "Signing location is required"),
  property_address: z.string().min(1, "Property address is required"),
  // Step 2
  signers: z
    .array(signerSchema)
    .length(3)
    .refine(
      (signers) =>
        signers.every((s) => {
          const hasAny = s.first_name || s.last_name || s.email || s.phone;
          const completeIfPresent =
            !hasAny || (!!s.first_name && !!s.last_name);
          return completeIfPresent;
        }),
      "Signer entries must include first and last name if started"
    ),
  // Step 3
  service_type: z.string().min(1, "Signing type is required"),
  rate_of_pay: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? null : Number(v)),
    z.number().positive("Rate must be positive").nullable()
  ),
  scanbacks_required: z.boolean().optional().default(false),
  shipping_service: z.string().optional(),
  tracking_number: z.string().optional(),
  notes: z.string().optional(),
  // Step 4
  initial_docs: z.instanceof(FileList).optional(),
});

type FormValues = z.infer<typeof schema>;

const signingTypes = [
  "refinance",
  "buyer_only",
  "seller_only",
  "reverse_mortgage",
  "debt_consolidation_contract",
  "title_signing",
  "cash_purchase",
  "other",
];

interface OrderWizardProps {
  onSuccess: () => void;
  clientOptions: { id: string; name: string }[];
}

const OrderWizard: React.FC<OrderWizardProps> = ({ onSuccess, clientOptions }) => {
  const { user } = useSession();
  const [step, setStep] = useState(1);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date(),
      time: "10:00",
      signers: [{}, {}, {}],
      scanbacks_required: false,
    },
  });

  const selectedClientName = useMemo(() => {
    const id = form.watch("client_id");
    return clientOptions.find((c) => c.id === id)?.name || "";
  }, [clientOptions, form]);

  const next = () => setStep((s) => Math.min(4, s + 1));
  const prev = () => setStep((s) => Math.max(1, s - 1));

  const combineDateTime = (date: Date, time: string) => {
    const [hh, mm] = time.split(":").map((n) => parseInt(n, 10));
    return setMinutes(setHours(date, hh), mm);
  };

  const uploadFiles = async (orderId: string, files: FileList | undefined, docType: "initial" | "signed" | "signer_id") => {
    if (!files || files.length === 0 || !user) return;

    const bucket = "order-documents";
    const uploads = Array.from(files).map(async (file) => {
      const path = `${user.id}/${orderId}/${docType}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { error: rowErr } = await supabase
        .from("order_documents")
        .insert({ user_id: user.id, order_id: orderId, file_path: path, doc_type: docType });
      if (rowErr) throw rowErr;
    });

    await Promise.all(uploads);
  };

  const onSubmit = async (values: FormValues) => {
    if (!user) {
      showError("You must be logged in.");
      return;
    }
    try {
      const signing_datetime = combineDateTime(values.date, values.time);

      const orderPayload = {
        user_id: user.id,
        client_id: values.client_id,
        order_date: format(values.date, "yyyy-MM-dd"),
        service_type: values.service_type,
        status: "pending",
        total_amount: values.rate_of_pay ?? null,
        notes: values.notes || null,
        signing_datetime,
        location: values.location,
        property_address: values.property_address,
        rate_of_pay: values.rate_of_pay,
        scanbacks_required: values.scanbacks_required ?? false,
        shipping_service: values.shipping_service || null,
        tracking_number: values.tracking_number || null,
        completion_status: "pending",
      };

      const { data: orderInsert, error: orderErr } = await supabase
        .from("orders")
        .insert(orderPayload)
        .select("id")
        .single();
      if (orderErr) throw orderErr;

      const orderId = orderInsert.id as string;

      // Insert signers (only those with names)
      const signers = (values.signers || []).filter((s) => s.first_name && s.last_name);
      if (signers.length > 0) {
        const signersPayload = signers.map((s) => ({
          user_id: user.id,
          order_id: orderId,
          first_name: s.first_name!,
          last_name: s.last_name!,
          email: s.email || null,
          phone: s.phone || null,
        }));
        const { error: signerErr } = await supabase.from("order_signers").insert(signersPayload);
        if (signerErr) throw signerErr;
      }

      // Upload initial docs
      await uploadFiles(orderId, values.initial_docs, "initial");

      showSuccess("Order created!");
      onSuccess();
      form.reset();
    } catch (e: any) {
      console.error(e);
      showError(e.message || "Failed to create order");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Client: {selectedClientName || "Not selected"}</div>
        <div className="flex gap-2">
          <div className={cn("h-2 w-10 rounded", step >= 1 ? "bg-blue-600" : "bg-gray-300")} />
          <div className={cn("h-2 w-10 rounded", step >= 2 ? "bg-blue-600" : "bg-gray-300")} />
          <div className={cn("h-2 w-10 rounded", step >= 3 ? "bg-blue-600" : "bg-gray-300")} />
          <div className={cn("h-2 w-10 rounded", step >= 4 ? "bg-blue-600" : "bg-gray-300")} />
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Client */}
          <FormField
            control={form.control}
            name="client_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {clientOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {step === 1 && (
            <div className="grid gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Signing Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date("1900-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Signing Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Signing Location</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Title office, client home, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="property_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main St, City, ST 12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-6">
              {[0, 1, 2].map((idx) => (
                <div key={idx} className="rounded-lg border p-4">
                  <div className="font-medium mb-2">Signer {idx + 1}</div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`signers.${idx}.first_name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="First name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`signers.${idx}.last_name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Last name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`signers.${idx}.email`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="email@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`signers.${idx}.phone`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="(555) 555-5555" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-4">
              <FormField
                control={form.control}
                name="service_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Signing Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select signing type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {signingTypes.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rate_of_pay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rate of Pay ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="0.00"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-center gap-2">
                <FormField
                  control={form.control}
                  name="scanbacks_required"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox checked={!!field.value} onCheckedChange={(v) => field.onChange(Boolean(v))} />
                      </FormControl>
                      <FormLabel className="m-0">Scanbacks / Faxbacks Required</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="shipping_service"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prepaid Shipping Service</FormLabel>
                    <FormControl>
                      <Input placeholder="FedEx, UPS, USPS, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tracking_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tracking Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Tracking number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Special Notes / Instructions</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Notes from title company..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {step === 4 && (
            <div className="grid gap-4">
              <FormField
                control={form.control}
                name="initial_docs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Upload Initial Documents</FormLabel>
                    <FormControl>
                      <Input type="file" multiple onChange={(e) => field.onChange(e.target.files)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          <div className="flex justify-between">
            <Button type="button" variant="ghost" onClick={prev} disabled={step === 1}>
              Back
            </Button>
            {step < 4 ? (
              <Button type="button" onClick={next}>
                Next
              </Button>
            ) : (
              <Button type="submit">Add Order</Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
};

export default OrderWizard;