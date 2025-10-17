"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { toast } from "sonner";
import { useSession } from "@/contexts/SessionContext";
import { supabase } from "@/integrations/supabase/client";

type Vendor = {
  id: string;
  user_id: string;
  ein: string;
  w9_on_file: boolean;
  w9_file_path: string | null;
  created_at: string;
};

const VendorManagementPage: React.FC = () => {
  const { user } = useSession();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);

  const [ein, setEin] = useState("");
  const [w9OnFile, setW9OnFile] = useState(false);
  const [w9File, setW9File] = useState<File | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const query = supabase
      .from("vendors")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          toast.error("Failed to load vendors.");
          return;
        }
        setVendors(data || []);
      });
    Promise.resolve(query).finally(() => setLoading(false));
  }, [user]);

  const addVendor = async () => {
    if (!user) return;
    if (!ein) {
      toast.error("EIN is required.");
      return;
    }

    // First create vendor
    const { data: insertData, error: insertError } = await supabase
      .from("vendors")
      .insert({ user_id: user.id, ein, w9_on_file: w9OnFile })
      .select();

    if (insertError) {
      toast.error("Failed to add vendor.");
      return;
    }

    let createdVendor = insertData?.[0] as Vendor | undefined;

    // If a file is selected, upload and update vendor with file path
    if (w9File && createdVendor) {
      const filePath = `${user.id}/${createdVendor.id}/${Date.now()}_${w9File.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("vendor_w9s")
        .upload(filePath, w9File, { upsert: false });

      if (uploadError) {
        toast.error("Failed to upload W-9.");
      } else {
        const { data: updateData, error: updateError } = await supabase
          .from("vendors")
          .update({ w9_on_file: true, w9_file_path: uploadData?.path ?? filePath })
          .eq("id", createdVendor.id)
          .select();

        if (updateError) {
          toast.error("Failed to save W-9 metadata.");
        } else {
          createdVendor = updateData?.[0] ?? createdVendor;
        }
      }
    }

    toast.success("Vendor added.");
    setVendors((prev) => (createdVendor ? [createdVendor, ...prev] : prev));
    setEin("");
    setW9OnFile(false);
    setW9File(null);
  };

  const uploadW9ForVendor = async (vendorId: string, file: File) => {
    if (!user) return;
    const filePath = `${user.id}/${vendorId}/${Date.now()}_${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("vendor_w9s")
      .upload(filePath, file, { upsert: false });

    if (uploadError) {
      toast.error("Failed to upload W-9.");
      return;
    }

    const { data: updateData, error: updateError } = await supabase
      .from("vendors")
      .update({ w9_on_file: true, w9_file_path: uploadData?.path ?? filePath })
      .eq("id", vendorId)
      .select();

    if (updateError) {
      toast.error("Failed to save W-9 metadata.");
      return;
    }

    toast.success("W-9 uploaded.");
    setVendors((prev) =>
      prev.map((v) => (v.id === vendorId ? { ...v, w9_on_file: true, w9_file_path: updateData?.[0]?.w9_file_path ?? v.w9_file_path } : v))
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Vendor</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="ein">EIN</Label>
            <Input id="ein" value={ein} onChange={(e) => setEin(e.target.value)} placeholder="12-3456789" required />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="w9" checked={w9OnFile} onCheckedChange={(val) => setW9OnFile(Boolean(val))} />
            <Label htmlFor="w9">W-9 on file</Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="w9file">Upload W-9 (PDF or image)</Label>
            <Input
              id="w9file"
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => setW9File(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={addVendor}>Save Vendor</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vendors</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>EIN</TableHead>
                <TableHead>W-9 On File</TableHead>
                <TableHead>Upload/Replace W-9</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3}>Loading...</TableCell>
                </TableRow>
              ) : vendors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3}>No vendors yet.</TableCell>
                </TableRow>
              ) : (
                vendors.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell>{vendor.ein}</TableCell>
                    <TableCell>{vendor.w9_on_file ? "Yes" : "No"}</TableCell>
                    <TableCell>
                      <Input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadW9ForVendor(vendor.id, file);
                          e.currentTarget.value = "";
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorManagementPage;