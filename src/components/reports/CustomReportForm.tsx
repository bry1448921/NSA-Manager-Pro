"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2Icon, DownloadIcon, FileTextIcon, FileDownIcon } from 'lucide-react';
import { exportToCsv } from '@/utils/report-exports';
import { exportToPdf } from '@/utils/report-pdf-exports';
import { format } from 'date-fns';

interface ColumnDefinition {
  key: string;
  label: string;
  type?: 'date' | 'number' | 'string' | 'boolean';
}

const tableSchemas: { [key: string]: ColumnDefinition[] } = {
  clients: [
    { key: 'id', label: 'Client ID' },
    { key: 'first_name', label: 'First Name' },
    { key: 'last_name', label: 'Last Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'address', label: 'Address' },
    { key: 'created_at', label: 'Created At', type: 'date' },
  ],
  notarizations: [
    { key: 'id', label: 'Notarization ID' },
    { key: 'client_id', label: 'Client ID' },
    { key: 'document_type', label: 'Document Type' },
    { key: 'notarization_date', label: 'Date', type: 'date' },
    { key: 'status', label: 'Status' },
    { key: 'notes', label: 'Notes' },
    { key: 'clients.first_name', label: 'Client First Name' },
    { key: 'clients.last_name', label: 'Client Last Name' },
    { key: 'created_at', label: 'Created At', type: 'date' },
  ],
  orders: [
    { key: 'id', label: 'Order ID' },
    { key: 'client_id', label: 'Client ID' },
    { key: 'order_date', label: 'Order Date', type: 'date' },
    { key: 'service_type', label: 'Service Type' },
    { key: 'status', label: 'Status' },
    { key: 'total_amount', label: 'Total Amount', type: 'number' },
    { key: 'notes', label: 'Notes' },
    { key: 'clients.first_name', label: 'Client First Name' },
    { key: 'clients.last_name', label: 'Client Last Name' },
    { key: 'created_at', label: 'Created At', type: 'date' },
  ],
  income: [
    { key: 'id', label: 'Income ID' },
    { key: 'account_id', label: 'Account ID' },
    { key: 'amount', label: 'Amount', type: 'number' },
    { key: 'description', label: 'Description' },
    { key: 'income_date', label: 'Date', type: 'date' },
    { key: 'category', label: 'Category' },
    { key: 'bank_accounts.account_name', label: 'Bank Account Name' },
    { key: 'bank_accounts.bank_name', label: 'Bank Name' },
    { key: 'created_at', label: 'Created At', type: 'date' },
  ],
  expenses: [
    { key: 'id', label: 'Expense ID' },
    { key: 'account_id', label: 'Account ID' },
    { key: 'amount', label: 'Amount', type: 'number' },
    { key: 'description', label: 'Description' },
    { key: 'expense_date', label: 'Date', type: 'date' },
    { key: 'category', label: 'Category' },
    { key: 'bank_accounts.account_name', label: 'Bank Account Name' },
    { key: 'bank_accounts.bank_name', label: 'Bank Name' },
    { key: 'created_at', label: 'Created At', type: 'date' },
  ],
  bank_accounts: [
    { key: 'id', label: 'Account ID' },
    { key: 'account_name', label: 'Account Name' },
    { key: 'bank_name', label: 'Bank Name' },
    { key: 'account_type', label: 'Account Type' },
    { key: 'current_balance', label: 'Current Balance', type: 'number' },
    { key: 'created_at', label: 'Created At', type: 'date' },
  ],
  notary_credentials: [
    { key: 'id', label: 'Credential ID' },
    { key: 'state', label: 'State' },
    { key: 'commission_number', label: 'Commission #' },
    { key: 'commission_expiration_date', label: 'Commission Expiration', type: 'date' },
    { key: 'bond_provider', label: 'Bond Provider' },
    { key: 'bond_expiration_date', label: 'Bond Expiration', type: 'date' },
    { key: 'e_o_insurance_provider', label: 'E&O Provider' },
    { key: 'e_o_insurance_expiration_date', label: 'E&O Expiration', type: 'date' },
    { key: 'e_o_insurance_amount', label: 'E&O Amount', type: 'number' },
    { key: 'created_at', label: 'Created At', type: 'date' },
  ],
};

const CustomReportForm: React.FC = () => {
  const { user } = useSession();
  const [dataSource, setDataSource] = useState<string>('');
  const [availableColumns, setAvailableColumns] = useState<ColumnDefinition[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);

  useEffect(() => {
    if (dataSource) {
      setAvailableColumns(tableSchemas[dataSource]);
      setSelectedColumns([]);
      setReportData([]);
      setReportGenerated(false);
    } else {
      setAvailableColumns([]);
      setSelectedColumns([]);
      setReportData([]);
      setReportGenerated(false);
    }
  }, [dataSource]);

  const handleColumnToggle = (key: string) => {
    setSelectedColumns((prev) =>
      prev.includes(key) ? prev.filter((col) => col !== key) : [...prev, key]
    );
  };

  const generateReport = useCallback(async () => {
    if (!user) {
      showError('You must be logged in to generate reports.');
      return;
    }
    if (!dataSource || selectedColumns.length === 0) {
      showError('Please select a data source and at least one column.');
      return;
    }

    setLoading(true);
    setReportData([]);
    setReportGenerated(false);

    try {
      const selectString = selectedColumns
        .map((colKey) => {
          if (colKey.includes('.')) {
            const [relation, field] = colKey.split('.');
            return `${relation}(${field})`;
          }
          return colKey;
        })
        .join(',');

      const { data, error } = await supabase
        .from(dataSource)
        .select(selectString)
        .eq('user_id', user.id);

      if (error) throw error;

      setReportData(data || []);
      setReportGenerated(true);
    } catch (error: any) {
      console.error('Error generating custom report:', error.message);
      showError(`Failed to generate report: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [user, dataSource, selectedColumns]);

  const handleExportCsv = () => {
    if (reportData.length === 0) {
      showError('No data to export.');
      return;
    }

    const headers = selectedColumns.map(colKey => {
      const colDef = availableColumns.find(def => def.key === colKey);
      return colDef ? colDef.label : colKey;
    });

    const formattedData = reportData.map(row => {
      const newRow: { [key: string]: any } = {};
      selectedColumns.forEach(colKey => {
        const colDef = availableColumns.find(def => def.key === colKey);
        let value = row;
        if (colKey.includes('.')) {
          const parts = colKey.split('.');
          value = row[parts[0]] ? row[parts[0]][parts[1]] : null;
        } else {
          value = row[colKey];
        }

        if (colDef?.type === 'date' && value) {
          newRow[colDef.label] = format(new Date(value), 'yyyy-MM-dd');
        } else if (colDef?.type === 'number' && value !== null && value !== undefined) {
          newRow[colDef.label] = Number(value).toFixed(2);
        } else {
          newRow[colDef.label] = value;
        }
      });
      return newRow;
    });

    exportToCsv(`${dataSource}_custom_report.csv`, formattedData, headers);
  };

  const handleExportPdf = () => {
    if (reportData.length === 0) {
      showError('No data to export to PDF.');
      return;
    }
    exportToPdf('custom-report-content', `${dataSource}_custom_report.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col space-y-2">
          <Label htmlFor="data-source">Select Data Source</Label>
          <Select onValueChange={(value: string) => setDataSource(value)} value={dataSource}>
            <SelectTrigger id="data-source">
              <SelectValue placeholder="Choose a data source" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(tableSchemas).map((key) => (
                <SelectItem key={key} value={key}>
                  {key.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col space-y-2">
          <Label>Select Columns</Label>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border p-2 rounded-md">
            {availableColumns.length === 0 ? (
              <p className="text-sm text-muted-foreground col-span-2">Select a data source first.</p>
            ) : (
              availableColumns.map((col) => (
                <div key={col.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={`col-${col.key}`}
                    checked={selectedColumns.includes(col.key)}
                    onCheckedChange={() => handleColumnToggle(col.key)}
                  />
                  <Label htmlFor={`col-${col.key}`}>{col.label}</Label>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button onClick={generateReport} disabled={loading || !dataSource || selectedColumns.length === 0}>
          {loading ? (
            <>
              <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> Generating...
            </>
          ) : (
            <>
              <FileTextIcon className="mr-2 h-4 w-4" /> Generate Report
            </>
          )}
        </Button>
        <Button onClick={handleExportCsv} disabled={reportData.length === 0 || loading} variant="outline">
          <DownloadIcon className="mr-2 h-4 w-4" /> Export CSV
        </Button>
        <Button onClick={handleExportPdf} disabled={reportData.length === 0 || loading} variant="outline">
          <FileDownIcon className="mr-2 h-4 w-4" /> Export PDF
        </Button>
      </div>

      {reportGenerated && reportData.length > 0 && (
        <div id="custom-report-content" className="mt-8 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <h3 className="text-xl font-semibold mb-4">Generated Report</h3>
          <div className="overflow-x-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  {selectedColumns.map((colKey) => {
                    const colDef = availableColumns.find(def => def.key === colKey);
                    return <TableHead key={colKey}>{colDef ? colDef.label : colKey}</TableHead>;
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {selectedColumns.map((colKey) => {
                      const colDef = availableColumns.find(def => def.key === colKey);
                      let value = row;
                      if (colKey.includes('.')) {
                        const parts = colKey.split('.');
                        value = row[parts[0]] ? row[parts[0]][parts[1]] : null;
                      } else {
                        value = row[colKey];
                      }

                      let displayValue = value;
                      if (colDef?.type === 'date' && value) {
                        displayValue = format(new Date(value), 'PPP');
                      } else if (colDef?.type === 'number' && value !== null && value !== undefined) {
                        displayValue = `$${Number(value).toFixed(2)}`;
                      } else if (value === null || value === undefined || value === '') {
                        displayValue = '-';
                      }

                      return <TableCell key={`${rowIndex}-${colKey}`}>{displayValue}</TableCell>;
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {reportGenerated && reportData.length === 0 && !loading && (
        <p className="text-center text-gray-600 dark:text-gray-400 mt-8">No data found for the selected criteria.</p>
      )}
    </div>
  );
};

export default CustomReportForm;