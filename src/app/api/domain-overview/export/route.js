import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { format, keywords, pages, type } = body;

    if (type === 'keywords') {
      if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
        return NextResponse.json({ error: 'No keywords to export' }, { status: 400 });
      }
      const headers = ['Keyword', 'Rank', 'Volume', 'Traffic', 'CPC', 'URL', 'Score'];
      const rows = keywords.map((k) => [
        k.keyword || '',
        k.rank || '-',
        String(k.volume || 0),
        String(k.traffic || 0),
        k.cpc || '-',
        k.url || '',
        k.score !== undefined ? String(k.score) : '-',
      ]);

      if (format === 'csv') {
        const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': 'attachment; filename="domain-overview-keywords.csv"',
          },
        });
      }
      if (format === 'xlsx') {
        const XLSX = await import('xlsx');
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Top Keywords');
        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        return new NextResponse(buf, {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename="domain-overview-keywords.xlsx"',
          },
        });
      }
    }

    if (type === 'pages') {
      if (!pages || !Array.isArray(pages) || pages.length === 0) {
        return NextResponse.json({ error: 'No pages to export' }, { status: 400 });
      }
      const headers = ['Page', 'Organic Traffic', 'Keywords'];
      const rows = pages.map((p) => [
        p.url || p.page || '',
        String(p.organicTraffic || 0),
        String(p.keywords || 0),
      ]);

      if (format === 'csv') {
        const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': 'attachment; filename="domain-overview-pages.csv"',
          },
        });
      }
      if (format === 'xlsx') {
        const XLSX = await import('xlsx');
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Top Pages');
        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        return new NextResponse(buf, {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename="domain-overview-pages.xlsx"',
          },
        });
      }
    }

    return NextResponse.json({ error: 'Unsupported format or type' }, { status: 400 });
  } catch (err) {
    console.error('Domain overview export error:', err);
    return NextResponse.json({ error: err.message || 'Export failed' }, { status: 500 });
  }
}
