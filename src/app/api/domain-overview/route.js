import { NextResponse } from 'next/server';
import { checkQuota, logAction } from '@/lib/quota';

const DFSEO_BASE = 'https://api.dataforseo.com';

const COUNTRY_MAP = {
  'united_states': 2840,
  'united_kingdom': 2826,
  'china': 2156,
  'germany': 2276,
  'australia': 2036,
  'canada': 2040,
  'japan': 2392,
  'india': 2356,
  'brazil': 2076,
  'spain': 2724,
  'italy': 2380,
  'netherlands': 2528,
  'france': 2250,
  'russia': 2643,
  'south_korea': 2410,
  'turkey': 2792,
  'poland': 2616,
  'sweden': 2752,
  'mexico': 2484,
  'indonesia': 2360,
  'south_africa': 2710,
};

export async function POST(request) {
  try {
    const quotaCheck = checkQuota(request, 'domain_overview', 'search');
    if (!quotaCheck.allowed) {
      if (quotaCheck.reason === 'auth_required') {
        return NextResponse.json(
          { error: 'Please sign in to use this feature.', code: 'AUTH_REQUIRED' },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: quotaCheck.reason === 'module_access_denied'
            ? 'You do not have access to this module.'
            : `Daily limit reached (${quotaCheck.limit}). Resets at midnight UTC.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { domain, country = 'united_states', includeSubdomains = false } = body;

    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
    }

    const login = process.env.DATAFORSEO_LOGIN;
    const password = process.env.DATAFORSEO_PASSWORD;

    if (!login || !password) {
      return NextResponse.json(
        { error: 'Search API credentials not configured.' },
        { status: 500 }
      );
    }

    const auth = Buffer.from(`${login}:${password}`).toString('base64');
    const locationCode = COUNTRY_MAP[country] || 2840;
    const cleanTarget = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    // 1. Fetch domain keywords
    const keywordsPromise = fetch(`${DFSEO_BASE}/v3/keywords_data/google/keywords_for_domain/live`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([{
        target: cleanTarget,
        location_code: locationCode,
        language_code: 'en',
        limit: 100,
      }]),
      signal: AbortSignal.timeout(30000),
    });

    // 2. Fetch domain pages (from DataForSEO Labs domain_pages)
    const pagesPromise = fetch(`${DFSEO_BASE}/v3/dataforseo_labs/domain_pages/live`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([{
        target: cleanTarget,
        location_code: locationCode,
        language_code: 'en',
        limit: 50,
        filters: includeSubdomains ? undefined : [['domain', '!=', 'true']],
      }]),
      signal: AbortSignal.timeout(30000),
    });

    // 3. Fetch domain metrics
    const metricsPromise = fetch(`${DFSEO_BASE}/v3/dataforseo_labs/domain_metrics/live`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([{
        target: cleanTarget,
        location_code: locationCode,
        language_code: 'en',
      }]),
      signal: AbortSignal.timeout(30000),
    });

    const [keywordsRes, pagesRes, metricsRes] = await Promise.allSettled([keywordsPromise, pagesPromise, metricsPromise]);

    // Process keywords
    let keywords = [];
    if (keywordsRes.status === 'fulfilled' && keywordsRes.value.ok) {
      const data = await keywordsRes.value.json();
      const items = data?.tasks?.[0]?.result?.[0]?.items || [];
      keywords = items.map((item) => ({
        keyword: item.keyword || '',
        rank: item.rank_absolute || item.rank_group || '-',
        volume: item.search_volume || 0,
        traffic: item.etv || 0,
        cpc: item.cpc ? `$${item.cpc}` : '-',
        url: item.url || '',
        score: item.keyword_difficulty !== undefined ? Math.round(item.keyword_difficulty) : undefined,
      })).filter((k) => k.keyword);
    }

    // Process pages
    let pages = [];
    if (pagesRes.status === 'fulfilled' && pagesRes.value.ok) {
      const data = await pagesRes.value.json();
      const items = data?.tasks?.[0]?.result?.[0]?.items || [];
      pages = items.map((item) => ({
        page: item.url || '',
        url: item.url || '',
        organicTraffic: item.etv || item.estimated_traffic || 0,
        keywords: item.keywords_count || 0,
      })).filter((p) => p.page);
    }

    // If pages API failed, fallback to keywords URLs as pages
    if (pages.length === 0) {
      const urlMap = {};
      keywords.forEach((k) => {
        if (k.url) {
          urlMap[k.url] = (urlMap[k.url] || { organicTraffic: 0, keywords: 0 });
          urlMap[k.url].organicTraffic += Number(k.traffic) || 0;
          urlMap[k.url].keywords += 1;
        }
      });
      pages = Object.entries(urlMap)
        .map(([url, stats]) => ({ page: url, url, organicTraffic: stats.organicTraffic, keywords: stats.keywords }))
        .sort((a, b) => b.organicTraffic - a.organicTraffic)
        .slice(0, 50);
    }

    // Process metrics
    let metrics = { organicTraffic: 0, organicKeywords: 0 };
    if (metricsRes.status === 'fulfilled' && metricsRes.value.ok) {
      const data = await metricsRes.value.json();
      const result = data?.tasks?.[0]?.result?.[0];
      if (result) {
        metrics = {
          organicTraffic: result.organic_etv || result.estimated_traffic || 0,
          organicKeywords: result.organic_keywords_count || 0,
        };
      }
    }

    logAction({
      userId: quotaCheck.user?.id,
      userEmail: quotaCheck.user?.email,
      module: 'domain_overview',
      action: 'search',
      quotaConsumed: quotaCheck.weight || 2,
      status: 'success',
      detail: `Domain: ${cleanTarget}`,
    });

    return NextResponse.json(
      { keywords, pages, metrics, domain: cleanTarget },
      { headers: { 'X-RateLimit-Remaining': String(quotaCheck.remaining), 'X-RateLimit-Limit': String(quotaCheck.limit) } }
    );
  } catch (err) {
    console.error('Domain overview API error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
