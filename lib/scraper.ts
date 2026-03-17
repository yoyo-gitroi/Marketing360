/* eslint-disable @typescript-eslint/no-explicit-any */
import { load as cheerioLoad } from 'cheerio'

export interface ScrapedData {
  text: string
  images: { link: string; title: string }[]
  fonts: string[]
  colors: {
    body?: { text: string; background: string; border: string }
    h1?: { text: string; background: string; border: string }
    h2?: { text: string; background: string; border: string }
    link?: { text: string; background: string; border: string }
    button?: { text: string; background: string; border: string }
  }
  additionalData: { text: string }[]
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

/**
 * Fetch HTML from a URL with timeout and user-agent
 */
async function fetchHTML(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: controller.signal,
      redirect: 'follow',
    })

    clearTimeout(timeout)

    if (!res.ok) {
      console.error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`)
      return null
    }

    return await res.text()
  } catch (err: any) {
    console.error(`Error fetching ${url}: ${err.message}`)
    return null
  }
}

/**
 * Extract visible text content from HTML
 */
function extractText($: any): string {
  // Remove non-visible elements
  $('script, style, noscript, nav, footer, header, [aria-hidden="true"]').remove()

  const text = $('body').text()
  // Collapse whitespace
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * Extract images with alt text
 */
function extractImages($: any, baseUrl: string): { link: string; title: string }[] {
  const images: { link: string; title: string }[] = []

  $('img').each((_i: number, el: any) => {
    const src = $(el).attr('src')
    const alt = $(el).attr('alt') || 'No alt text'
    if (src) {
      try {
        const absoluteUrl = new URL(src, baseUrl).href
        images.push({ link: absoluteUrl, title: alt.trim() })
      } catch { /* ignore bad URLs */ }
    }
  })

  return images
}

/**
 * Extract font references from stylesheets and inline styles
 */
function extractFonts($: any): string[] {
  const fonts = new Set<string>()

  // From Google Fonts link tags
  $('link[href*="fonts.googleapis.com"]').each((_i: number, el: any) => {
    const href = $(el).attr('href') || ''
    const familyMatch = href.match(/family=([^&]+)/)
    if (familyMatch) {
      familyMatch[1].split('|').forEach((f: string) => {
        fonts.add(f.split(':')[0].replace(/\+/g, ' '))
      })
    }
  })

  // From @font-face and font-family in style tags
  $('style').each((_i: number, el: any) => {
    const css = $(el).text()
    const fontFamilyMatches = css.match(/font-family\s*:\s*([^;{}]+)/gi)
    if (fontFamilyMatches) {
      fontFamilyMatches.forEach((match: string) => {
        const value = match.replace(/font-family\s*:\s*/i, '').trim()
        const cleaned = value.replace(/['",]/g, '').trim()
        if (cleaned && !cleaned.includes('inherit') && !cleaned.includes('initial')) {
          fonts.add(cleaned.split(',')[0].trim())
        }
      })
    }
  })

  // From inline styles
  $('[style*="font-family"]').each((_i: number, el: any) => {
    const style = $(el).attr('style') || ''
    const match = style.match(/font-family\s*:\s*([^;]+)/i)
    if (match) {
      const cleaned = match[1].replace(/['",]/g, '').trim()
      fonts.add(cleaned.split(',')[0].trim())
    }
  })

  return Array.from(fonts)
}

/**
 * Extract colors from inline styles and style tags
 */
function extractColors($: any): ScrapedData['colors'] {
  const colorRegex = /(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\))/g
  const brandColors = new Set<string>()

  // From style tags
  $('style').each((_i: number, el: any) => {
    const css = $(el).text()
    const matches = css.match(colorRegex)
    if (matches) matches.forEach((c: string) => brandColors.add(c))
  })

  // From inline styles
  $('[style]').each((_i: number, el: any) => {
    const style = $(el).attr('style') || ''
    const matches = style.match(colorRegex)
    if (matches) matches.forEach((c: string) => brandColors.add(c))
  })

  // From meta theme-color
  const themeColor = $('meta[name="theme-color"]').attr('content')
  if (themeColor) brandColors.add(themeColor)

  // Build a basic color structure from what we found
  const allColors = Array.from(brandColors).slice(0, 20)

  return {
    body: { text: allColors[0] || '', background: allColors[1] || '', border: '' },
    h1: { text: allColors[2] || allColors[0] || '', background: '', border: '' },
    h2: { text: allColors[3] || allColors[0] || '', background: '', border: '' },
    link: { text: allColors[4] || '', background: '', border: '' },
    button: { text: allColors[5] || '', background: allColors[6] || '', border: '' },
  }
}

/**
 * Find internal links on a page
 */
function findInternalLinks($: any, baseUrl: string): string[] {
  const domain = new URL(baseUrl).hostname
  const links = new Set<string>()

  $('a[href]').each((_i: number, el: any) => {
    const href = $(el).attr('href')
    if (href) {
      try {
        const absoluteUrl = new URL(href, baseUrl)
        if (
          (absoluteUrl.protocol === 'http:' || absoluteUrl.protocol === 'https:') &&
          absoluteUrl.hostname === domain
        ) {
          absoluteUrl.hash = ''
          links.add(absoluteUrl.href)
        }
      } catch { /* ignore */ }
    }
  })

  return Array.from(links)
}

/**
 * Filter for relevant internal pages
 */
function filterRelevantLinks(links: string[]): string[] {
  const keywords = ['product', 'price', 'pricing', 'about', 'service', 'team', 'story', 'mission', 'our-', 'who-we']
  return links.filter((link) => {
    const lower = link.toLowerCase()
    return keywords.some((kw) => lower.includes(kw))
  })
}

/**
 * Scrape a single page using fetch + cheerio
 */
async function scrapePage(
  url: string,
  options = { images: true, text: true, fonts: true, colors: true }
): Promise<{
  images: { link: string; title: string }[]
  text: string
  fonts: string[]
  colors: ScrapedData['colors']
  internalLinks: string[]
} | null> {
  const html = await fetchHTML(url)
  if (!html) return null

  const $ = cheerioLoad(html)

  return {
    images: options.images ? extractImages($, url) : [],
    text: options.text ? extractText($) : '',
    fonts: options.fonts ? extractFonts($) : [],
    colors: options.colors ? extractColors($) : {},
    internalLinks: findInternalLinks($, url),
  }
}

/**
 * Main scraper: fetches main page + relevant subpages using fetch + cheerio.
 * Works reliably on Vercel serverless (no headless browser needed).
 */
export async function scrapeWebsite(url: string): Promise<ScrapedData> {
  // 1. Scrape main page
  const mainData = await scrapePage(url)

  if (!mainData) {
    throw new Error(`Failed to fetch content from ${url}`)
  }

  const result: ScrapedData = {
    text: mainData.text,
    images: mainData.images,
    fonts: mainData.fonts,
    colors: mainData.colors || {},
    additionalData: [],
  }

  // 2. Find and scrape relevant internal pages (text only, up to 3)
  const relevant = filterRelevantLinks(mainData.internalLinks).slice(0, 3)

  // Scrape subpages in parallel for speed
  const subResults = await Promise.allSettled(
    relevant.map((link) =>
      scrapePage(link, { images: false, text: true, fonts: false, colors: false })
    )
  )

  for (const sub of subResults) {
    if (sub.status === 'fulfilled' && sub.value?.text) {
      result.additionalData.push({ text: sub.value.text.substring(0, 5000) })
    }
  }

  return result
}
