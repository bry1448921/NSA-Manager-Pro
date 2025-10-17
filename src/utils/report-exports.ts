import { saveAs } from 'file-saver';

export const exportToCsv = (filename: string, data: any[], headers?: string[]) => {
  if (!data || data.length === 0) {
    console.warn('No data to export.');
    return;
  }

  const csvRows: string[] = [];

  // Add headers if provided, otherwise infer from first object keys
  if (headers) {
    csvRows.push(headers.join(','));
  } else {
    const inferredHeaders = Object.keys(data[0]);
    csvRows.push(inferredHeaders.join(','));
  }

  // Add data rows
  for (const row of data) {
    const values = (headers || Object.keys(data[0])).map(header => {
      const value = row[header];
      // Handle null/undefined, escape commas and quotes
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    csvRows.push(values.join(','));
  }

  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, filename);
};