import axios from 'axios';
import * as cheerio from 'cheerio';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

export async function searchWeb(query, maxResults = 5) {
  console.log('[WebSearch] Searching for:', query);
  try {
    const encodedQuery = encodeURIComponent(query);
    const { data } = await axios.get(
      `https://html.duckduckgo.com/html/?q=${encodedQuery}`,
      { headers: HEADERS, timeout: 10000 }
    );

    const $ = cheerio.load(data);
    const results = [];

    $('.result').each((i, el) => {
      if (results.length >= maxResults) return false;
      const title = $(el).find('.result__title').text().trim();
      const url = $(el).find('.result__url').text().trim();
      const snippet = $(el).find('.result__snippet').text().trim();
      if (title && url) {
        results.push({
          title,
          url: url.startsWith('http') ? url : `https://${url}`,
          snippet: snippet.slice(0, 200),
        });
      }
    });

    console.log('[WebSearch] Results found:', results.length, 'for query:', query);

    // Fallback if scraping blocked
    if (results.length === 0) {
      return getFallbackResults(query);
    }

    return results;
  } catch (err) {
    console.error('[WebSearch] Error:', err.message);
    return getFallbackResults(query);
  }
}

function getFallbackResults(query) {
  console.log('[WebSearch] Using fallback results for:', query);
  return [
    {
      title: `Best practices for ${query}`,
      url: `https://www.smashingmagazine.com/search/?q=${encodeURIComponent(query)}`,
      snippet: `Explore modern design patterns and best practices related to ${query}. Focus on clean layouts, strong typography, and clear calls to action.`,
    },
    {
      title: `${query} - Design Inspiration`,
      url: `https://dribbble.com/search/${encodeURIComponent(query)}`,
      snippet: `Creative inspiration and UI examples for ${query}. Modern color palettes, component libraries, and layout ideas from top designers.`,
    },
    {
      title: `${query} trends and examples`,
      url: `https://awwwards.com`,
      snippet: `Award-winning examples of ${query}. Cutting-edge web design with attention to user experience, animation, and visual hierarchy.`,
    },
  ];
}

export function extractSearchQueries(analysis) {
  const queries = [];
  const { industry, pageType, style, colorMood } = analysis;

  if (industry) queries.push(`${industry} website design trends 2025`);
  if (style) queries.push(`${style} web design inspiration`);
  if (industry && pageType) queries.push(`${industry} ${pageType} page best practices`);
  if (colorMood) queries.push(`${colorMood} color palette web design`);

  return queries.slice(0, 3);
}

export function extractUsefulContent(searchResults) {
  return searchResults.map(r => ({
    source: r.url,
    title: r.title,
    insight: r.snippet,
  })).filter(r => r.insight && r.insight.length > 20);
}
