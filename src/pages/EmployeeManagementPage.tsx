"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { toast } from "sonner";
import { useSession } from "@/contexts/SessionContext";
import { supabase } from "@/integrations/supabase/client";

type Employee = {
  id: string;
  user_id: string;
  ssn: string;
  dob: string;
  position: string;
  manager: string;
  date_of_hire: string;
  date_of_termination: string | null;
  created_at: string;
};

const EmployeeManagementPage: React.FC = () => {
  const { user } = useSession();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);

  const [ssn, setSsn] = useState("");
  const [dob, setDob] = useState("");
  const [position, setPosition] = useState("");
  const [manager, setManager] = useState("");
  const [dateOfHire, setDateOfHire] = useState("");
  const [dateOfTermination, setDateOfTermination] = useState("");

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const query = supabase
      .from("employees")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          toast.error("Failed to load employees.");
          return;
        }
        setEmployees(data || []);
      });
    Promise.resolve(query).finally(() => setLoading(false));
  }, [user]);

  const addEmployee = async () => {
    if (!user) return;

    if (!ssn || !dob || !position || !manager || !dateOfHire) {
      toast.error("Please fill all required fields.");
      return;
    }

    const { data, error } = await supabase
      .from("employees")
      .insert({
        user_id: user.id,
        ssn,
        dob,
        position,
        manager,
        date_of_hire: dateOfHire,
        date_of_termination: dateOfTermination || null,
      })
      .select();

    if (error) {
      toast.error("Failed to add employee.");
      return;
    }

    toast.success("Employee added.");
    setEmployees((prev) => (data ? [...data, ...prev] : prev));
    setSsn("");
    setDob("");
    setPosition("");
    setManager("");
    setDateOfHire("");
    setDateOfTermination("");
  };

  const uploadReview = async (employeeId: string, file: File) => {
    if (!user) return;

    const filePath = `${user.id}/${employeeId}/${Date.now()}_${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("employee_reviews")
      .upload(filePath, file, { upsert: false });

    if (uploadError) {
      toast.error("Failed to upload review.");
      return;
    }

    const { error: insertError } = await supabase.from("employee_reviews").insert({
      user_id: user.id,
      employee_id: employeeId,
      file_path: uploadData?.path ?? filePath,
    });

    if (insertError) {
      toast.error("Failed to save review metadata.");
      return;
    }

    toast.success("Performance review uploaded.");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Employee</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ssn">SSN</Label>
            <Input id="ssn" value={ssn} onChange={(e) => setSsn(e.target.value)} placeholder="123-45-6789" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dob">Date of Birth</Label>
            <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="position">Position</Label>
            <Input id="position" value={position} onChange={(e) => setPosition(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="manager">Manager</Label>
            <Input id="manager" value={manager} onChange={(e) => setManager(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doh">Date of Hire</Label>
            <Input id="doh" type="date" value={dateOfHire} onChange={(e) => setDateOfHire(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dot">Date of Termination (Optional)</Label>
            <Input id="dot" type="date" value={dateOfTermination} onChange={(e) => setDateOfTermination(e.target.value)} />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button onClick={addEmployee}>Save Employee</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employees</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SSN</TableHead>
                <TableHead>DOB</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Hire Date</TableHead>
                <TableHead>Termination</TableHead>
                <TableHead>Upload Review</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7}>Loading...</TableCell>
                </TableRow>
              ) : employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>No employees yet.</TableCell>
                </TableRow>
              ) : (
                employees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell>{emp.ssn}</TableCell>
                    <TableCell>{emp.dob}</TableCell>
                    <TableCell>{emp.position}</TableCell>
                    <TableCell>{emp.manager}</TableCell>
                    <TableCell>{emp.date_of_hire}</TableCell>
                    <TableCell>{emp.date_of_termination ?? "-"}</TableCell>
                    <TableCell>
                      <Input
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadReview(emp.id, file);
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

export default EmployeeManagementPage;