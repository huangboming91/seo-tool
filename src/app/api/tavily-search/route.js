import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { keyword, numResults = 10 } = body;

    if (!keyword) {
      return NextResponse.json({ error: 'Keyword is required' }, { status: 400 });
    }

    const apiKey = process.env.TAVILY_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Tavily API key not configured' },
        { status: 500 }
      );
    }

    const tavRes = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: keyword,
        search_depth: 'advanced',
        max_results: Math.min(numResults, 20),
        include_answer: true,
        include_raw_content: false,
        include_domains: [],
        exclude_domains: [],
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!tavRes.ok) {
      const errText = await tavRes.text();
      return NextResponse.json(
        { error: `Tavily API error: ${tavRes.status}` },
        { status: 502 }
      );
    }

    const data = await tavRes.json();
    const results = data.results || [];

    const serpPages = results.map((r, i) => {
      const url = r.url || '';
      const isBlog = /\/blog\/|\/article\/|blog\./i.test(url);
      const isProduct = /\/product\/|\/shop\/|store\./i.test(url);

      return {
        rank: i + 1,
        title: r.title || '',
        url: url,
        h1: '',
        meta: r.content ? r.content.slice(0, 160) : '',
        type: isBlog ? 'blog' : isProduct ? 'product' : 'article',
      };
    });

    return NextResponse.json({
      serp_pages: serpPages,
      keywords: [],
      clusters: [],
    });

  } catch (err) {
    return NextResponse.json(
      { error: err.message || 'Tavily search failed' },
      { status: 500 }
    );
  }
}
