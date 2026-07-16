import { NextResponse } from 'next/server';
import { checkQuota, logAction } from '@/lib/quota';

const DFSEO_BASE = 'https://api.dataforseo.com';

async function callDfseo(endpoint, payload) {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  const auth = Buffer.from(`${login}:${password}`).toString('base64');

  const res = await fetch(`${DFSEO_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();

  if (json.status_code && json.status_code !== 20000) {
    throw new Error(json.status_message || `Search API error: ${json.status_code}`);
  }

  if (json.tasks_error && json.tasks_error > 0) {
    const task = json.tasks?.[0];
    if (task && task.status_code !== 20000) {
      throw new Error(task.status_message || 'Search API task error');
    }
  }

  return json;
}

export async function POST(request) {
  try {
    const quotaCheck = await checkQuota(request, 'brand_lookup', 'search');
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
    const { target, platform, country } = body;

    if (!target || !target.trim()) {
      return NextResponse.json({ error: 'Brand or domain is required' }, { status: 400 });
    }

    // Build target array for DataForSEO
    const targetInput = target.trim();
    const isDomain = targetInput.includes('.') && !targetInput.includes(' ');
    const targetArray = isDomain
      ? [{ domain: targetInput, search_filter: 'include', search_scope: ['sources', 'search_results'] }]
      : [{ keyword: targetInput, search_filter: 'include', search_scope: ['question', 'answer'] }];

    const locationCode = country === 'us' ? 2840 : country === 'uk' ? 2826 : country === 'de' ? 2276 : country === 'fr' ? 2250 : country === 'ca' ? 2124 : country === 'au' ? 2036 : country === 'jp' ? 2392 : country === 'cn' ? 2156 : country === 'in' ? 2356 : country === 'br' ? 2076 : 2840;

    const basePayload = {
      target: targetArray,
      location_code: locationCode,
      language_code: 'en',
    };

    if (platform && platform !== 'both') {
      basePayload.platform = platform;
    }

    // Call all endpoints in parallel
    const [metricsRes, mentionsRes, topPagesRes, topDomainsRes, historicalRes] = await Promise.allSettled([
      callDfseo('/v3/ai_optimization/llm_mentions/target_metrics/live', basePayload),
      callDfseo('/v3/ai_optimization/llm_mentions/search_mentions/live', { ...basePayload, limit: 100 }),
      callDfseo('/v3/ai_optimization/llm_mentions/top_pages/live', { ...basePayload, limit: 100 }),
      callDfseo('/v3/ai_optimization/llm_mentions/top_domains/live', { ...basePayload, limit: 100 }),
      callDfseo('/v3/ai_optimization/llm_mentions/historical/live', {
        keyword: targetInput,
        match_type: 'partial_match',
        ...(platform && platform !== 'both' ? { platform } : {}),
      }),
    ]);

    // Parse metrics
    let overview = { totalMentions: 0, aiSearchVolume: 0, sourcesDomains: 0, searchResultsDomains: 0 };
    if (metricsRes.status === 'fulfilled') {
      const result = metricsRes.value?.tasks?.[0]?.result?.[0];
      if (result) {
        const total = result.total || {};
        overview = {
          totalMentions: total.mentions || 0,
          aiSearchVolume: total.ai_search_volume || 0,
          sourcesDomains: (result.sources_domain || []).length,
          searchResultsDomains: (result.search_results_domain || []).length,
        };
      }
    }

    // Parse mentions
    let mentions = [];
    if (mentionsRes.status === 'fulfilled') {
      const items = mentionsRes.value?.tasks?.[0]?.result?.[0]?.items || [];
      mentions = items.map((item) => ({
        question: item.question || '',
        answer: (item.answer || '').substring(0, 300),
        platform: item.platform || 'unknown',
        location: item.location_code || '',
        language: item.language_code || '',
        aiSearchVolume: item.ai_search_volume || 0,
        monthlySearches: item.monthly_searches || [],
        sources: (item.sources || []).map((s) => s.domain || s.url || ''),
        searchResults: (item.search_results || []).map((s) => s.domain || s.url || ''),
      }));
    }

    // Parse top pages
    let topPages = [];
    if (topPagesRes.status === 'fulfilled') {
      const items = topPagesRes.value?.tasks?.[0]?.result?.[0]?.items || [];
      topPages = items.map((item) => ({
        page: item.page || item.url || '',
        domain: extractDomain(item.page || item.url || ''),
        mentions: item.mentions || 0,
        aiSearchVolume: item.ai_search_volume || 0,
      }));
    }

    // Parse top domains
    let topDomains = [];
    if (topDomainsRes.status === 'fulfilled') {
      const items = topDomainsRes.value?.tasks?.[0]?.result?.[0]?.items || [];
      topDomains = items.map((item) => ({
        domain: item.domain || '',
        mentions: item.mentions || 0,
        aiSearchVolume: item.ai_search_volume || 0,
      }));
    }

    // Parse historical
    let history = [];
    if (historicalRes.status === 'fulfilled') {
      const items = historicalRes.value?.tasks?.[0]?.result?.[0]?.items || [];
      history = items.map((item) => ({
        label: (item.month || item.date || '').substring(5, 7) + '/' + (item.month || item.date || '').substring(2, 4),
        month: item.month || item.date || '',
        mentions: item.mentions || 0,
        aiSearchVolume: item.ai_search_volume || 0,
      }));
    }

    const response = NextResponse.json({
      target: targetInput,
      overview,
      mentions,
      topPages,
      topDomains,
      history,
      errors: {
        metrics: metricsRes.status === 'rejected' ? metricsRes.reason?.message : null,
        mentions: mentionsRes.status === 'rejected' ? mentionsRes.reason?.message : null,
        topPages: topPagesRes.status === 'rejected' ? topPagesRes.reason?.message : null,
        topDomains: topDomainsRes.status === 'rejected' ? topDomainsRes.reason?.message : null,
        historical: historicalRes.status === 'rejected' ? historicalRes.reason?.message : null,
      },
    });

    logAction({
      userId: quotaCheck.user?.id,
      userEmail: quotaCheck.user?.email,
      module: 'brand_lookup',
      action: 'search',
      quotaConsumed: quotaCheck.weight || 2,
      status: 'success',
      detail: `Target: ${target}`,
    });

    response.headers.set('X-RateLimit-Limit', String(quotaCheck.limit));
    response.headers.set('X-RateLimit-Remaining', String(quotaCheck.remaining));
    return response;
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed to fetch brand lookup data' }, { status: 500 });
  }
}

function extractDomain(url) {
  if (!url) return '';
  try {
    const u = new URL(url.startsWith('http') ? url : 'https://' + url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
