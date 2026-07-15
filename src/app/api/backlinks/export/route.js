import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { format, type, data } = body;

    if (!format || !type || !data) {
      return NextResponse.json({ error: 'Missing format, type, or data' }, { status: 400 });
    }

    const rows = data;
    let headers, filename;

    if (type === 'backlinks') {
      headers = ['Source', 'Source Title', 'Target', 'Anchor', 'Dofollow', 'Nofollow', 'Domain Authority', 'Link Authority', 'Spam Score', 'First Seen', 'Lost', 'Broken'];
      filename = 'backlinks';
    } else if (type === 'referring-domains') {
      headers = ['Domain', 'Backlinks', 'Referring Pages', 'Rank', 'Spam Score', 'First Seen', 'Broken Links', 'Broken Pages'];
      filename = 'referring-domains';
    } else if (type === 'top-pages') {
      headers = ['Page', 'Backlinks', 'Referring Domains', 'Rank', 'Broken Backlinks'];
      filename = 'top-pages';
    } else {
      return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
    }

    if (format === 'csv') {
      const { Parser } = await import('json2csv');
      const fieldMap = {};
      if (type === 'backlinks') {
        fieldMap.Source = 'source';
        fieldMap['Source Title'] = 'sourceTitle';
        fieldMap.Target = 'target';
        fieldMap.Anchor = 'anchor';
        fieldMap.Dofollow = 'dofollow';
        fieldMap.Nofollow = 'nofollow';
        fieldMap['Domain Authority'] = 'domainAuthority';
        fieldMap['Link Authority'] = 'linkAuthority';
        fieldMap['Spam Score'] = 'spamScore';
        fieldMap['First Seen'] = 'firstSeen';
        fieldMap.Lost = 'lost';
        fieldMap.Broken = 'broken';
      } else if (type === 'referring-domains') {
        fieldMap.Domain = 'domain';
        fieldMap.Backlinks = 'backlinks';
        fieldMap['Referring Pages'] = 'referringPages';
        fieldMap.Rank = 'rank';
        fieldMap['Spam Score'] = 'spamScore';
        fieldMap['First Seen'] = 'firstSeen';
        fieldMap['Broken Links'] = 'brokenLinks';
        fieldMap['Broken Pages'] = 'brokenPages';
      } else {
        fieldMap.Page = 'page';
        fieldMap.Backlinks = 'backlinks';
        fieldMap['Referring Domains'] = 'referringDomains';
        fieldMap.Rank = 'rank';
        fieldMap['Broken Backlinks'] = 'brokenBacklinks';
      }
      const parser = new Parser({ fields: headers.map((h) => ({ label: h, value: fieldMap[h] })) });
      const csv = parser.parse(rows);
      const blob = new TextEncoder().encode(csv);

      return new NextResponse(blob, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
        },
      });
    }

    if (format === 'xlsx') {
      const xlsx = await import('xlsx');
      const mapped = rows.map((r) => {
        if (type === 'backlinks') {
          return {
            Source: r.source || '',
            'Source Title': r.sourceTitle || '',
            Target: r.target || '',
            Anchor: r.anchor || '',
            Dofollow: r.dofollow ? 'Yes' : 'No',
            Nofollow: r.nofollow ? 'Yes' : 'No',
            'Domain Authority': r.domainAuthority || 0,
            'Link Authority': r.linkAuthority || 0,
            'Spam Score': r.spamScore || 0,
            'First Seen': r.firstSeen || '',
            Lost: r.lost ? 'Yes' : 'No',
            Broken: r.broken ? 'Yes' : 'No',
          };
        } else if (type === 'referring-domains') {
          return {
            Domain: r.domain || '',
            Backlinks: r.backlinks || 0,
            'Referring Pages': r.referringPages || 0,
            Rank: r.rank || 0,
            'Spam Score': r.spamScore || 0,
            'First Seen': r.firstSeen || '',
            'Broken Links': r.brokenLinks || 0,
            'Broken Pages': r.brokenPages || 0,
          };
        } else {
          return {
            Page: r.page || '',
            Backlinks: r.backlinks || 0,
            'Referring Domains': r.referringDomains || 0,
            Rank: r.rank || 0,
            'Broken Backlinks': r.brokenBacklinks || 0,
          };
        }
      });

      const ws = xlsx.utils.json_to_sheet(mapped);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'Backlinks');
      const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

      return new NextResponse(buf, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
        },
      });
    }

    return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
  } catch (err) {
    console.error('Export error:', err);
    return NextResponse.json({ error: err.message || 'Export failed' }, { status: 500 });
  }
}
