import { NextResponse } from 'next/server';

const DFSEO_BASE = 'https://api.dataforseo.com';

const LANGUAGE_MAP = {
  'English': 'en',
  'Chinese': 'zh',
  'Spanish': 'es',
  'German': 'de',
  'French': 'fr',
};

const COUNTRY_MAP = {
  'United States': 2840,
  'United Kingdom': 2826,
  'China': 2156,
  'Germany': 2276,
  'Australia': 2036,
};

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
]);

function classifyPageType(url, title) {
  const lowerUrl = (url || '').toLowerCase();
  const lowerTitle = (title || '').toLowerCase();

  if (/\/blog\/|\/article\/|\/post\/|blog\./i.test(lowerUrl)) return 'blog';
  if (/\/product\/|\/item\/|\/shop\/|store\.|shop\./i.test(lowerUrl)) return 'product';
  if (/\/category\/|\/collection\/|\/topic\//i.test(lowerUrl)) return 'category';
  if (/pricing|buy|signup|demo|trial|get-started/i.test(lowerUrl) || /pricing|purchase|buy now/i.test(lowerTitle)) return 'landing';

  return 'article';
}

function extractKeywords(text, maxKeywords = 30) {
  if (!text) return [];
  const words = text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));

  const freq = {};
  words.forEach((w) => { freq[w] = (freq[w] || 0) + 1; });

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word, count]) => ({ word, count }));
}

function clusterKeywords(keywords, serpTitles) {
  if (keywords.length === 0) return [];

  const clusters = [];

  const toolCluster = keywords.filter((kw) =>
    /software|tool|platform|app|solution|system|service|product/.test(kw.word)
  );

  const guideCluster = keywords.filter((kw) =>
    /guide|how|what|why|best|tips|tutorial|learn|strategy/.test(kw.word)
  );

  const compareCluster = keywords.filter((kw) =>
    /vs|versus|compar|alternat|competitor|review/.test(kw.word)
  );

  const featureCluster = keywords.filter((kw) =>
    /featur|pric|cost|benefit|advantage|function/.test(kw.word)
  );

  const remaining = keywords.filter((kw) =>
    !toolCluster.includes(kw) && !guideCluster.includes(kw) &&
    !compareCluster.includes(kw) && !featureCluster.includes(kw)
  );

  if (toolCluster.length > 0) {
    const kw = toolCluster[0];
    clusters.push({
      cluster_name: 'Tools & Platforms',
      primary_keyword: kw.word,
      supporting_keywords: toolCluster.slice(1, 5).map((k) => k.word).join(', '),
      slug: kw.word.replace(/\s+/g, '-').toLowerCase(),
      priority: 'high',
    });
  }

  if (guideCluster.length > 0) {
    const kw = guideCluster[0];
    clusters.push({
      cluster_name: 'Guides & Education',
      primary_keyword: kw.word,
      supporting_keywords: guideCluster.slice(1, 5).map((k) => k.word).join(', '),
      slug: kw.word.replace(/\s+/g, '-').toLowerCase(),
      priority: 'high',
    });
  }

  if (compareCluster.length > 0) {
    const kw = compareCluster[0];
    clusters.push({
      cluster_name: 'Comparisons & Reviews',
      primary_keyword: kw.word,
      supporting_keywords: compareCluster.slice(1, 5).map((k) => k.word).join(', '),
      slug: kw.word.replace(/\s+/g, '-').toLowerCase(),
      priority: 'medium',
    });
  }

  if (featureCluster.length > 0) {
    const kw = featureCluster[0];
    clusters.push({
      cluster_name: 'Features & Pricing',
      primary_keyword: kw.word,
      supporting_keywords: featureCluster.slice(1, 5).map((k) => k.word).join(', '),
      slug: kw.word.replace(/\s+/g, '-').toLowerCase(),
      priority: 'medium',
    });
  }

  if (remaining.length >= 3) {
    clusters.push({
      cluster_name: 'General Keywords',
      primary_keyword: remaining[0].word,
      supporting_keywords: remaining.slice(1, 5).map((k) => k.word).join(', '),
      slug: remaining[0].word.replace(/\s+/g, '-').toLowerCase(),
      priority: 'low',
    });
  }

  return clusters;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { keyword, numResults = 10 } = body;

    if (!keyword) {
      return NextResponse.json({ error: 'Keyword is required' }, { status: 400 });
    }

    const login = process.env.DATAFORSEO_LOGIN;
    const password = process.env.DATAFORSEO_PASSWORD;

    if (!login || !password) {
      return NextResponse.json(
        { error: 'DataForSEO API credentials not configured. Add DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD to environment variables.' },
        { status: 500 }
      );
    }

    const languageCode = LANGUAGE_MAP[body.language] || 'en';
    const locationCode = COUNTRY_MAP[body.country] || 2840;

    console.log(`DataForSEO request: keyword="${keyword}", language=${languageCode}, location=${locationCode}, depth=${numResults}`);

    const auth = Buffer.from(`${login}:${password}`).toString('base64');

    let serpItems = [];

    try {
      const dfRes = await fetch(`${DFSEO_BASE}/v3/serp/google/organic/live/advanced`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([{
          keyword,
          language_code: languageCode,
          location_code: locationCode,
          depth: Math.min(numResults, 100),
          se_type: 'organic',
        }]),
        signal: AbortSignal.timeout(30000),
      });

      if (!dfRes.ok) {
        const errText = await dfRes.text();
        console.error('DataForSEO API error:', dfRes.status, errText);
        return NextResponse.json(
          { error: `DataForSEO API returned ${dfRes.status}. Please check your API credentials and balance.` },
          { status: 502 }
        );
      }

      const dfData = await dfRes.json();
      const tasks = dfData?.tasks || [];

      if (tasks.length === 0 || !tasks[0]?.result) {
        return NextResponse.json(
          { error: 'No results returned from DataForSEO. Your account balance may be insufficient.' },
          { status: 502 }
        );
      }

      const resultItems = tasks[0].result[0]?.items || [];

      serpItems = resultItems
        .filter((item) => item.type === 'organic')
        .slice(0, numResults)
        .map((item, index) => ({
          rank: index + 1,
          title: item.title || '',
          url: item.url || '',
          h1: '',
          meta: item.description || '',
          type: classifyPageType(item.url || '', item.title || ''),
        }));

    } catch (fetchErr) {
      console.error('DataForSEO fetch error:', fetchErr);
      return NextResponse.json(
        { error: `Failed to connect to DataForSEO: ${fetchErr.message}` },
        { status: 502 }
      );
    }

    const allText = serpItems
      .map((item) => `${item.title} ${item.meta}`)
      .join(' ');

    const extractedKws = extractKeywords(allText);

    const clusters = clusterKeywords(extractedKws, serpItems.map((s) => s.title));

    const keywords = extractedKws.map((kw, i) => {
      const cluster = clusters.find((c) =>
        c.supporting_keywords.includes(kw.word) || c.primary_keyword === kw.word
      );
      return {
        keyword: kw.word,
        keyword_type: i < 3 ? 'primary' : i < 8 ? 'secondary' : 'informational',
        theme_cluster: cluster ? cluster.cluster_name : 'General',
        suggested_page_type: i < 5 ? 'comparison' : 'guide',
        slug: kw.word.replace(/\s+/g, '-').toLowerCase(),
        data_basis: i < 3 ? 'SERP volume' : 'keyword frequency',
        related_search: '',
        related_questions: '',
      };
    });

    return NextResponse.json({
      serp_pages: serpItems,
      keywords,
      clusters,
    });

  } catch (err) {
    console.error('Search API error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
