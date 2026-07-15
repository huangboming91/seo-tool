import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { format, keywords, domain } = body;

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json({ error: 'No keywords to export' }, { status: 400 });
    }

    const headers = ['Keyword', 'Position', 'URL', 'Volume', 'Change'];

    const rows = keywords.map((k) => [
      k.keyword || '',
      k.position || '-',
      k.url || '',
      String(k.volume || 0),
      (() => {
        const prev = k.previousPosition === '-' ? null : Number(k.previousPosition);
        const curr = k.position === '-' ? null : Number(k.position);
        if (prev === null && curr === null) return '-';
        if (prev === null) return 'New';
        if (curr === null) return 'Lost';
        const diff = prev - curr;
        if (diff > 0) return `+${diff}`;
        if (diff < 0) return `${diff}`;
        return '-';
      })(),
    ]);

    if (format === 'csv') {
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${domain}-rank-tracking.csv"`,
        },
      });
    }

    if (format === 'xlsx') {
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Rank Tracking');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      return new NextResponse(buf, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${domain}-rank-tracking.xlsx"`,
        },
      });
    }

    return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
  } catch (err) {
    console.error('Rank tracking export error:', err);
    return NextResponse.json({ error: err.message || 'Export failed' }, { status: 500 });
  }
}
