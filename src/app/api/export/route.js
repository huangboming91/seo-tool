import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { format, serp_pages = [], keywords = [], clusters = [] } = body;

    if (format === 'xlsx') {
      const XLSX = await import('xlsx');

      const wb = XLSX.utils.book_new();

      const serpData = serp_pages.map((r) => ({
        Rank: r.rank,
        'Page Title': r.title,
        URL: r.url,
        H1: r.h1 || '',
        Meta: r.meta || '',
        'Page Type': r.type,
      }));
      const serpSheet = XLSX.utils.json_to_sheet(serpData);
      XLSX.utils.book_append_sheet(wb, serpSheet, 'serp_pages');

      const kwData = keywords.map((k) => ({
        keyword: k.keyword,
        volume: k.volume,
        cpc: k.cpc,
        competition: k.competition,
        score: k.score,
        intent: k.intent,
        keyword_type: k.keyword_type,
        theme_cluster: k.theme_cluster,
        suggested_page_type: k.suggested_page_type,
        slug: k.slug,
        data_basis: k.data_basis,
        related_search: k.related_search || '',
        related_questions: k.related_questions || '',
      }));
      const kwSheet = XLSX.utils.json_to_sheet(kwData);
      XLSX.utils.book_append_sheet(wb, kwSheet, 'keywords');

      const clusterData = clusters.map((c) => ({
        cluster_name: c.cluster_name,
        primary_keyword: c.primary_keyword,
        supporting_keywords: c.supporting_keywords,
        slug: c.slug,
        priority: c.priority,
      }));
      const clusterSheet = XLSX.utils.json_to_sheet(clusterData);
      XLSX.utils.book_append_sheet(wb, clusterSheet, 'clusters');

      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      return new NextResponse(buf, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="seo-research-results.xlsx"',
        },
      });
    }

    if (format === 'csv') {
      const serpFields = ['Rank', 'Page Title', 'URL', 'H1', 'Meta', 'Page Type'];
      const kwFields = ['keyword', 'volume', 'cpc', 'competition', 'score', 'intent', 'keyword_type', 'theme_cluster', 'suggested_page_type', 'slug', 'data_basis', 'related_search', 'related_questions'];
      const clusterFields = ['cluster_name', 'primary_keyword', 'supporting_keywords', 'slug', 'priority'];

      const csvContent = [];
      csvContent.push(...generateCsv('serp_pages', serpFields, serp_pages));
      csvContent.push('---', '---', '---');
      csvContent.push(...generateCsv('keywords', kwFields, keywords));
      csvContent.push('---', '---', '---');
      csvContent.push(...generateCsv('clusters', clusterFields, clusters));

      return new NextResponse(csvContent.join('\n'), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="seo-research-results.csv"',
        },
      });
    }

    return NextResponse.json({ error: 'Unsupported format. Use xlsx or csv.' }, { status: 400 });

  } catch (err) {
    console.error('Export error:', err);
    return NextResponse.json(
      { error: `Export failed: ${err.message}` },
      { status: 500 }
    );
  }
}

function generateCsv(sheetName, fields, data) {
  const lines = [];
  lines.push(`# Sheet: ${sheetName}`);
  lines.push(fields.map((f) => `"${f}"`).join(','));
  for (const row of data) {
    const vals = fields.map((f) => {
      const key = f.replace(/ /g, '_').toLowerCase();
      const val = row[key] || row[f] || row[key.charAt(0).toUpperCase() + key.slice(1)] || '';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    });
    lines.push(vals.join(','));
  }
  return lines;
}
