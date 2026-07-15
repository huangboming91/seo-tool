import { NextResponse } from 'next/server';
import { Parser } from 'json2csv';
import * as XLSX from 'xlsx';

export async function POST(request) {
  try {
    const { format, data, type } = await request.json();
    if (!data || !format || !type) {
      return NextResponse.json({ error: 'Missing format, type, or data' }, { status: 400 });
    }

    if (type === 'pages') {
      const fields = [
        { label: 'URL', value: 'url' },
        { label: 'Status', value: 'status' },
        { label: 'Title', value: 'title' },
        { label: 'H1', value: 'h1' },
        { label: 'Words', value: 'words' },
        { label: 'Images', value: 'images' },
        { label: 'Speed (ms)', value: 'speed' },
        { label: 'Issues', value: (row) => (row.issues || []).join(', ') },
      ];

      if (format === 'csv') {
        const parser = new Parser({ fields });
        const csv = parser.parse(data);
        return new NextResponse(csv, {
          headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="site-audit-pages.csv"' },
        });
      }

      if (format === 'xlsx') {
        const rows = data.map((row) => ({
          URL: row.url,
          Status: row.status,
          Title: row.title,
          H1: row.h1,
          Words: row.words,
          Images: row.images,
          'Speed (ms)': row.speed,
          Issues: (row.issues || []).join(', '),
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Site Audit Pages');
        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        return new NextResponse(buf, {
          headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename="site-audit-pages.xlsx"' },
        });
      }
    }

    if (type === 'issues') {
      const flattened = [];
      for (const issue of data) {
        for (const page of issue.pages || []) {
          flattened.push({
            issue: issue.name,
            type: issue.type,
            description: issue.description,
            fix: issue.fix,
            page,
          });
        }
      }

      if (format === 'csv') {
        const fields = [
          { label: 'Issue', value: 'issue' },
          { label: 'Type', value: 'type' },
          { label: 'Description', value: 'description' },
          { label: 'Fix', value: 'fix' },
          { label: 'Page', value: 'page' },
        ];
        const parser = new Parser({ fields });
        const csv = parser.parse(flattened);
        return new NextResponse(csv, {
          headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="site-audit-issues.csv"' },
        });
      }

      if (format === 'xlsx') {
        const ws = XLSX.utils.json_to_sheet(flattened);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Site Audit Issues');
        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        return new NextResponse(buf, {
          headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename="site-audit-issues.xlsx"' },
        });
      }
    }

    return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Export failed' }, { status: 500 });
  }
}
