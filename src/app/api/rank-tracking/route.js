import { NextResponse } from 'next/server';
import { checkQuota, logAction } from '@/lib/quota';

const DFSEO_BASE = 'https://api.dataforseo.com';

const COUNTRY_MAP = {
  'world': 2840,
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

const LANGUAGE_MAP = {
  'english': 'en',
  'chinese': 'zh',
  'spanish': 'es',
  'german': 'de',
  'french': 'fr',
  'japanese': 'ja',
  'portuguese': 'pt',
  'italian': 'it',
  'russian': 'ru',
  'korean': 'ko',
  'arabic': 'ar',
  'dutch': 'nl',
  'turkish': 'tr',
  'polish': 'pl',
  'swedish': 'sv',
  'indonesian': 'id',
  'hindi': 'hi',
};

export async function POST(request) {
  try {
    const quotaCheck = checkQuota(request, 'rank_tracking', 'search');
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
    const { action } = body;
    const login = process.env.DATAFORSEO_LOGIN;
    const password = process.env.DATAFORSEO_PASSWORD;

    if (!login || !password) {
      return NextResponse.json(
        { error: 'Search API credentials not configured.' },
        { status: 500 }
      );
    }

    const auth = Buffer.from(`${login}:${password}`).toString('base64');

    // Action 1: discover keywords for a domain
    if (action === 'discover') {
      const { target, country = 'world', language = 'english' } = body;
      if (!target) {
        return NextResponse.json({ error: 'Target domain is required' }, { status: 400 });
      }

      const locationCode = COUNTRY_MAP[country] || 2840;
      const languageCode = LANGUAGE_MAP[language] || 'en';

      const cleanTarget = target.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

      const dfRes = await fetch(`${DFSEO_BASE}/v3/keywords_data/google/keywords_for_domain/live`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([{
          target: cleanTarget,
          location_code: locationCode,
          language_code: languageCode,
          limit: 100,
        }]),
        signal: AbortSignal.timeout(30000),
      });

      if (!dfRes.ok) {
        const errText = await dfRes.text();
        console.error('DataForSEO keywords_for_domain error:', dfRes.status, errText);
        // Fallback: try SERP search for the domain name
        return await fallbackDiscover(cleanTarget, locationCode, languageCode, auth, quotaCheck);
      }

      const dfData = await dfRes.json();
      const tasks = dfData?.tasks || [];
      if (tasks.length === 0 || !tasks[0]?.result) {
        return await fallbackDiscover(cleanTarget, locationCode, languageCode, auth, quotaCheck);
      }

      const resultItems = tasks[0].result[0]?.items || [];
      const keywords = resultItems.map((item) => ({
        keyword: item.keyword || '',
        position: item.rank_absolute || item.rank_group || '-',
        volume: item.search_volume || 0,
        traffic: item.etv || 0,
        url: item.url || '',
      })).filter((k) => k.keyword);

      logAction({
        userId: quotaCheck.user?.id,
        userEmail: quotaCheck.user?.email,
        module: 'rank_tracking',
        action: 'discover',
        quotaConsumed: quotaCheck.weight || 1,
        status: 'success',
        detail: `Domain: ${cleanTarget}`,
      });

      return NextResponse.json(
        { keywords, domain: cleanTarget },
        { headers: { 'X-RateLimit-Remaining': String(quotaCheck.remaining), 'X-RateLimit-Limit': String(quotaCheck.limit) } }
      );
    }

    // Action 2: check current rankings for a list of keywords
    if (action === 'check') {
      const { keywords, domain, country = 'world', language = 'english' } = body;
      if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
        return NextResponse.json({ error: 'Keywords array is required' }, { status: 400 });
      }
      if (!domain) {
        return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
      }

      const locationCode = COUNTRY_MAP[country] || 2840;
      const languageCode = LANGUAGE_MAP[language] || 'en';
      const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

      // For each keyword, query SERP to find domain position
      const results = [];
      for (const kw of keywords.slice(0, 10)) { // limit to 10 keywords per check to avoid excessive API calls
        try {
          const serpRes = await fetch(`${DFSEO_BASE}/v3/serp/google/organic/live/advanced`, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify([{
              keyword: kw.keyword,
              language_code: languageCode,
              location_code: locationCode,
              depth: 100,
              se_type: 'organic',
            }]),
            signal: AbortSignal.timeout(15000),
          });

          if (!serpRes.ok) continue;
          const serpData = await serpRes.json();
          const serpTasks = serpData?.tasks || [];
          if (serpTasks.length === 0 || !serpTasks[0]?.result) continue;

          const items = serpTasks[0].result[0]?.items || [];
          const organicItems = items.filter((i) => i.type === 'organic');
          const foundIndex = organicItems.findIndex((item) => {
            const itemDomain = (item.domain || item.url || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '');
            return itemDomain === cleanDomain || (item.url || '').includes(cleanDomain);
          });

          const position = foundIndex >= 0 ? foundIndex + 1 : '-';
          const url = foundIndex >= 0 ? organicItems[foundIndex].url : '';
          const title = foundIndex >= 0 ? organicItems[foundIndex].title : '';

          results.push({
            keyword: kw.keyword,
            position: position === '-' ? '-' : String(position),
            url: url || '',
            title: title || '',
            volume: kw.volume || 0,
            previousPosition: kw.position || '-',
          });
        } catch (e) {
          console.error('SERP check error for keyword:', kw.keyword, e.message);
          results.push({
            keyword: kw.keyword,
            position: '-',
            url: '',
            title: '',
            volume: kw.volume || 0,
            previousPosition: kw.position || '-',
          });
        }
      }

      return NextResponse.json(
        { results },
        { headers: { 'X-RateLimit-Remaining': String(quotaCheck.remaining), 'X-RateLimit-Limit': String(quotaCheck.limit) } }
      );
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

  } catch (err) {
    console.error('Rank tracking API error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

async function fallbackDiscover(target, locationCode, languageCode, auth, quotaCheck) {
  // Fallback: search for the domain name itself and extract keywords from SERP
  try {
    const serpRes = await fetch('https://api.dataforseo.com/v3/serp/google/organic/live/advanced', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{
        keyword: target,
        language_code: languageCode,
        location_code: locationCode,
        depth: 10,
        se_type: 'organic',
      }]),
      signal: AbortSignal.timeout(15000),
    });

    if (!serpRes.ok) {
      return NextResponse.json({ keywords: [], domain: target });
    }

    const data = await serpRes.json();
    const tasks = data?.tasks || [];
    if (tasks.length === 0 || !tasks[0]?.result) {
      return NextResponse.json({ keywords: [], domain: target });
    }

    const items = tasks[0].result[0]?.items || [];
    const organic = items.filter((i) => i.type === 'organic');

    // Extract keywords from titles and descriptions
    const allText = organic.map((i) => `${i.title || ''} ${i.description || ''}`).join(' ');
    const words = allText.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP_WORDS.has(w));

    const freq = {};
    words.forEach((w) => { freq[w] = (freq[w] || 0) + 1; });

    const keywords = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word, count]) => ({
        keyword: word,
        position: '-',
        volume: 0,
        traffic: 0,
        url: '',
      }));

    return NextResponse.json(
      { keywords, domain: target },
      { headers: { 'X-RateLimit-Remaining': String(quotaCheck.remaining), 'X-RateLimit-Limit': String(quotaCheck.limit) } }
    );
  } catch (e) {
    return NextResponse.json({ keywords: [], domain: target });
  }
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'can', 'shall', 'you', 'your',
  'we', 'our', 'they', 'their', 'it', 'its', 'this', 'that', 'these',
  'those', 'what', 'which', 'who', 'how', 'all', 'each', 'every',
  'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'not',
  'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'about',
  'also', 'if', 'then', 'here', 'there', 'when', 'up', 'down',
  'com', 'www', 'http', 'https', 'org', 'net', 'html', 'home', 'page',
  'site', 'web', 'online', 'click', 'more', 'read', 'view', 'visit',
]);
