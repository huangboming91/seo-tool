import { NextResponse } from 'next/server';
import { checkQuota, logAction } from '@/lib/quota';

const DFSEO_BASE = 'https://api.dataforseo.com';

function getAuth() {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) return null;
  return Buffer.from(`${login}:${password}`).toString('base64');
}

async function serpSitePages(domain, maxPages) {
  const auth = getAuth();
  if (!auth) throw new Error('Search API credentials not configured');

  const res = await fetch(`${DFSEO_BASE}/v3/serp/google/organic/live/advanced`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([{
      keyword: `site:${domain}`,
      language_code: 'en',
      location_code: 2840,
      depth: Math.min(maxPages, 100),
      se_type: 'organic',
    }]),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SERP API error ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = await res.json();
  const tasks = json?.tasks || [];
  const items = tasks[0]?.result?.[0]?.items || [];

  return items
    .filter((item) => item.type === 'organic' && item.url && item.url.includes(domain))
    .slice(0, maxPages)
    .map((item) => {
      let url = item.url;
      if (!url.startsWith('http')) url = 'https://' + url;
      return url;
    });
}

async function fetchInstantPages(urls) {
  const auth = getAuth();
  if (!auth) throw new Error('Search API credentials not configured');

  const tasks = urls.map((url) => ({ url }));
  const res = await fetch(`${DFSEO_BASE}/v3/on_page/instant_pages`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(tasks),
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OnPage API error ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = await res.json();
  const results = [];

  for (const task of json?.tasks || []) {
    const taskResult = task?.result?.[0];
    if (!taskResult) continue;
    for (const item of taskResult?.items || []) {
      if (item.resource_type === 'html') {
        results.push(item);
      }
    }
  }

  return results;
}

function buildPageData(item) {
  const meta = item.meta || {};
  const content = item.content || {};
  const timing = item.page_timing || {};
  const h1 = (meta.htags?.h1 || [])[0] || '';

  return {
    url: item.url,
    status: item.status_code || 0,
    title: meta.title || '',
    h1,
    words: Math.round(content.plain_text_word_count || 0),
    images: meta.images_count || 0,
    speed: timing.duration_time || 0,
    metaDescription: meta.description || '',
    canonical: meta.canonical || '',
    onpageScore: item.onpage_score || 0,
  };
}

function detectIssues(page, item) {
  const issues = [];
  const checks = item.checks || {};
  const meta = item.meta || {};
  const timing = item.page_timing || {};
  const content = item.content || {};

  if (checks.no_title || !meta.title || meta.title.trim() === '') {
    issues.push({ type: 'error', key: 'missing_title', name: 'Missing title', description: 'The page has no title tag.', fix: 'Add a unique, descriptive title tag of 50–60 characters.' });
  }

  if (checks.title_too_long || (meta.title_length && meta.title_length > 65)) {
    issues.push({ type: 'warning', key: 'title_too_long', name: 'Title too long', description: 'The title tag is longer than 65 characters and may be truncated in search results.', fix: 'Shorten the title to roughly 50–60 characters.' });
  }

  if (checks.title_too_short || (meta.title_length && meta.title_length < 30 && meta.title)) {
    issues.push({ type: 'warning', key: 'title_too_short', name: 'Title too short', description: 'The title tag is shorter than 30 characters.', fix: 'Expand the title to be more descriptive, around 50–60 characters.' });
  }

  if (checks.no_description || !meta.description || meta.description.trim() === '') {
    issues.push({ type: 'error', key: 'missing_meta_description', name: 'Missing meta description', description: 'The page has no meta description.', fix: 'Add a meta description of roughly 70–160 characters that summarizes the page and encourages clicks.' });
  }

  if (checks.no_h1_tag || !meta.htags?.h1 || meta.htags.h1.length === 0) {
    issues.push({ type: 'error', key: 'missing_h1', name: 'Missing H1', description: 'The page has no H1 heading.', fix: 'Add a single, descriptive H1 that includes the primary topic.' });
  }

  if (checks.high_loading_time || (timing.duration_time && timing.duration_time > 3000)) {
    issues.push({ type: 'warning', key: 'slow_page', name: 'Slow page speed', description: 'The page takes more than 3 seconds to load.', fix: 'Optimize images, reduce render-blocking scripts, and consider using a CDN.' });
  }

  if (checks.large_page_size || (item.size && item.size > 1024 * 1024)) {
    issues.push({ type: 'warning', key: 'large_page_size', name: 'Large page size', description: 'The page size exceeds 1 MB.', fix: 'Compress images, minify CSS/JS, and lazy-load non-critical resources.' });
  }

  if (checks.low_content_rate || (content.plain_text_rate && content.plain_text_rate < 0.1)) {
    issues.push({ type: 'info', key: 'low_content_rate', name: 'Low content rate', description: 'The ratio of text to page size is low.', fix: 'Reduce heavy scripts/styles and increase useful text content.' });
  }

  if (checks.no_image_alt) {
    issues.push({ type: 'warning', key: 'missing_alt_text', name: 'Images missing alt text', description: 'Some images on the page do not have alt attributes.', fix: 'Add descriptive alt text to all images.' });
  }

  if (checks.no_favicon) {
    issues.push({ type: 'info', key: 'missing_favicon', name: 'Missing favicon', description: 'The page has no favicon.', fix: 'Add a favicon to improve branding and trust.' });
  }

  if (item.status_code >= 400 || checks.is_broken || checks.is_4xx_code || checks.is_5xx_code) {
    issues.push({ type: 'error', key: 'broken_page', name: 'Broken page', description: `The page returned HTTP ${item.status_code}.`, fix: 'Fix the page or remove internal links pointing to it.' });
  }

  if (meta.canonical && meta.canonical !== item.url) {
    issues.push({ type: 'info', key: 'canonicalized', name: 'Canonicalized to another URL', description: 'The page points its canonical tag to a different URL.', fix: 'Ensure this is intentional and that the canonical target is the preferred version.' });
  }

  if (checks.https_to_http_links) {
    issues.push({ type: 'warning', key: 'https_to_http_links', name: 'HTTPS to HTTP links', description: 'The page links to insecure HTTP resources.', fix: 'Update internal links to use HTTPS.' });
  }

  return issues;
}

export async function POST(request) {
  try {
    const quotaCheck = checkQuota(request, 'site_audit', 'search');
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

    const { url, maxPages = 50, includeLighthouse = false } = await request.json();

    if (!url || !url.trim()) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    let domain = url.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
    if (!domain) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    const auth = getAuth();
    if (!auth) {
      return NextResponse.json({ error: 'Search API credentials not configured' }, { status: 500 });
    }

    // Limit pages to reasonable range for serverless
    const pagesLimit = Math.max(10, Math.min(Number(maxPages) || 50, 100));

    const pageUrls = await serpSitePages(domain, pagesLimit);

    if (pageUrls.length === 0) {
      return NextResponse.json({ error: 'No pages found for this domain. Try a different URL or increase the crawl limit.' }, { status: 404 });
    }

    // Fetch in batches of 20
    const batches = [];
    for (let i = 0; i < pageUrls.length; i += 20) {
      batches.push(pageUrls.slice(i, i + 20));
    }

    const allPageItems = [];
    for (const batch of batches) {
      const items = await fetchInstantPages(batch);
      allPageItems.push(...items);
    }

    if (allPageItems.length === 0) {
      return NextResponse.json({ error: 'Could not fetch on-page data for any discovered pages. Check your API balance.' }, { status: 502 });
    }

    const pages = [];
    const issueMap = {};
    let totalIssues = 0;
    let errorCount = 0;
    let warningCount = 0;
    let infoCount = 0;
    let totalSpeed = 0;
    let crawledCount = 0;

    for (const item of allPageItems) {
      const pageData = buildPageData(item);
      const issues = detectIssues(pageData, item);
      pageData.issues = issues.map((i) => i.key);
      pages.push(pageData);
      totalSpeed += pageData.speed;
      crawledCount++;

      for (const issue of issues) {
        if (!issueMap[issue.key]) {
          issueMap[issue.key] = {
            ...issue,
            pages: [],
            count: 0,
          };
        }
        issueMap[issue.key].pages.push(pageData.url);
        issueMap[issue.key].count++;
        totalIssues++;
        if (issue.type === 'error') errorCount++;
        if (issue.type === 'warning') warningCount++;
        if (issue.type === 'info') infoCount++;
      }
    }

    const issuesList = Object.values(issueMap).sort((a, b) => {
      const typeOrder = { error: 0, warning: 1, info: 2 };
      if (typeOrder[a.type] !== typeOrder[b.type]) return typeOrder[a.type] - typeOrder[b.type];
      return b.count - a.count;
    });

    logAction({
      userId: quotaCheck.user?.id,
      userEmail: quotaCheck.user?.email,
      module: 'site_audit',
      action: 'audit',
      quotaConsumed: quotaCheck.weight || 5,
      status: 'success',
      detail: `Domain: ${domain}, Pages: ${crawledCount}`,
    });

    return NextResponse.json({
      domain,
      url,
      maxPages: pagesLimit,
      includeLighthouse,
      crawledCount,
      pages,
      issues: issuesList,
      summary: {
        totalIssues,
        errors: errorCount,
        warnings: warningCount,
        infos: infoCount,
        avgResponse: crawledCount > 0 ? Math.round(totalSpeed / crawledCount) : 0,
      },
    });
  } catch (err) {
    console.error('Site audit error:', err);
    return NextResponse.json({ error: err.message || 'Site audit failed' }, { status: 500 });
  }
}
