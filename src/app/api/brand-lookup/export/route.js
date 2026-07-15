import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { format, type, data, target } = await request.json();

    if (!data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: 'No data to export' }, { status: 400 });
    }

    const targetName = target || 'brand-lookup';

    if (format === 'xlsx') {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      let sheetName = 'Brand Lookup';
      let rows = data;

      if (type === 'mentions') {
        sheetName = 'Mentions';
        rows = data.map((r) => ({
          Question: r.question || '',
          Answer: r.answer || '',
          Platform: r.platform || '',
          'AI Search Volume': r.aiSearchVolume || 0,
          Sources: (r.sources || []).join(', '),
        }));
      } else if (type === 'top-pages') {
        sheetName = 'Top Pages';
        rows = data.map((r) => ({
          Page: r.page || '',
          Domain: r.domain || '',
          Mentions: r.mentions || 0,
          'AI Search Volume': r.aiSearchVolume || 0,
        }));
      } else if (type === 'top-domains') {
        sheetName = 'Top Domains';
        rows = data.map((r) => ({
          Domain: r.domain || '',
          Mentions: r.mentions || 0,
          'AI Search Volume': r.aiSearchVolume || 0,
        }));
      }

      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      return new NextResponse(buf, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${targetName}-${type}.xlsx"`,
        },
      });
    } else if (format === 'csv') {
      let headers = [];
      let rows = [];

      if (type === 'mentions') {
        headers = ['Question', 'Answer', 'Platform', 'AI Search Volume', 'Sources'];
        rows = data.map((r) => [
          escapeCsv(r.question || ''),
          escapeCsv(r.answer || ''),
          escapeCsv(r.platform || ''),
          r.aiSearchVolume || 0,
          escapeCsv((r.sources || []).join('; ')),
        ]);
      } else if (type === 'top-pages') {
        headers = ['Page', 'Domain', 'Mentions', 'AI Search Volume'];
        rows = data.map((r) => [
          escapeCsv(r.page || ''),
          escapeCsv(r.domain || ''),
          r.mentions || 0,
          r.aiSearchVolume || 0,
        ]);
      } else if (type === 'top-domains') {
        headers = ['Domain', 'Mentions', 'AI Search Volume'];
        rows = data.map((r) => [
          escapeCsv(r.domain || ''),
          r.mentions || 0,
          r.aiSearchVolume || 0,
        ]);
      }

      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${targetName}-${type}.csv"`,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Export failed' }, { status: 500 });
  }
}

function escapeCsv(val) {
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
