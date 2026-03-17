/* eslint-disable @typescript-eslint/no-explicit-any */
import puppeteer, { type Browser, type Page } from 'puppeteer-core'

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

/**
 * Get browser launch config - uses @sparticuz/chromium on Vercel, local Chrome for dev
 */
async function getBrowserConfig(): Promise<any> {
  // Always try @sparticuz/chromium first (works on Vercel and can work locally)
  try {
    // Dynamic import with type assertion to handle incomplete @sparticuz/chromium types
    const chromiumModule = await import('@sparticuz/chromium')
    const chromium = chromiumModule.default as any
    const executablePath = await chromium.executablePath()

    return {
      args: chromium.args,
      defaultViewport: chromium.defaultViewport ?? { width: 1280, height: 720 },
      executablePath,
      headless: chromium.headless ?? true,
    }
  } catch (e: any) {
    console.warn('chromium package not available, trying local Chrome:', e.message)
  }

  // Fallback: local Chrome for development
  const fs = await import('fs')
  const localPaths = [
    process.env.CHROME_PATH,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ].filter(Boolean) as string[]

  for (const p of localPaths) {
    if (fs.existsSync(p)) {
      return {
        headless: true,
        executablePath: p,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--single-process',
        ],
      }
    }
  }

  throw new Error('No Chrome/Chromium binary found. Set CHROME_PATH env variable.')
}

/**
 * Scrape a single page: extract text, images, fonts, colors
 */
async function scrapePage(
  page: Page,
  url: string,
  options = { images: true, text: true, fonts: true, colors: true }
): Promise<{
  images: { link: string; title: string }[]
  text: string
  fonts: string[]
  colors: any
} | null> {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })

    let imagesData: { link: string; title: string }[] = []
    let visibleText = ''
    let fontsData: string[] = []
    let colorData: any = { specifics: {}, palette: [] }

    if (options.images) {
      imagesData = await page.evaluate((pageUrl: string) => {
        const data: { link: string; title: string }[] = []
        document.querySelectorAll('img').forEach((img: HTMLImageElement) => {
          const src = img.getAttribute('src')
          const alt = img.getAttribute('alt') || 'No alt text'
          if (src) {
            try {
              const absoluteUrl = new URL(src, pageUrl)
              data.push({ link: absoluteUrl.href, title: alt.trim() })
            } catch { /* ignore bad URLs */ }
          }
        })
        return data
      }, url)
    }

    if (options.text) {
      visibleText = await page.evaluate(() => {
        document.querySelectorAll('script, style, noscript').forEach(el => el.remove())
        return (document.body as HTMLElement).innerText
      })
      visibleText = visibleText.replace(/\s+/g, ' ').trim()
    }

    if (options.fonts) {
      fontsData = await page.evaluate(() => {
        const fontFamilies = new Set<string>()
        document.querySelectorAll('*').forEach(el => {
          const ff = window.getComputedStyle(el).getPropertyValue('font-family')
          if (ff) fontFamilies.add(ff)
        })
        return Array.from(fontFamilies)
      })
    }

    if (options.colors) {
      colorData = await page.evaluate(() => {
        const results: any = { specifics: {}, palette: [] }
        const getStyles = (el: Element | null) => {
          if (!el) return null
          const s = window.getComputedStyle(el)
          return {
            text_color: s.getPropertyValue('color'),
            background_color: s.getPropertyValue('background-color'),
            border_color: s.getPropertyValue('border-color'),
          }
        }
        results.specifics.body = getStyles(document.querySelector('body'))
        results.specifics.h1 = getStyles(document.querySelector('h1'))
        results.specifics.h2 = getStyles(document.querySelector('h2'))
        results.specifics.link = getStyles(document.querySelector('a'))
        results.specifics.button = getStyles(
          document.querySelector('button, [class*="btn"], a[role="button"]')
        )

        const paletteSet = new Set<string>()
        document.querySelectorAll('*').forEach(el => {
          const s = window.getComputedStyle(el)
          const c = s.getPropertyValue('color')
          const bg = s.getPropertyValue('background-color')
          if (c && c !== 'rgba(0, 0, 0, 0)') paletteSet.add(c)
          if (bg && bg !== 'rgba(0, 0, 0, 0)') paletteSet.add(bg)
        })
        results.palette = Array.from(paletteSet)
        return results
      })
    }

    const formatColor = (styles: any) =>
      styles
        ? { text: styles.text_color, background: styles.background_color, border: styles.border_color }
        : undefined

    return {
      images: imagesData,
      text: visibleText,
      fonts: fontsData,
      colors: {
        body: formatColor(colorData.specifics?.body),
        h1: formatColor(colorData.specifics?.h1),
        h2: formatColor(colorData.specifics?.h2),
        link: formatColor(colorData.specifics?.link),
        button: formatColor(colorData.specifics?.button),
      },
    }
  } catch (error: any) {
    console.error(`Error scraping ${url}: ${error.message}`)
    return null
  }
}

/**
 * Find internal links on a page
 */
async function findInternalLinks(page: Page, url: string): Promise<string[]> {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
    const links = await page.evaluate((baseUrl: string) => {
      const uniqueHrefs = new Set<string>()
      const pageDomain = new URL(baseUrl).hostname
      document.querySelectorAll('a').forEach((link: HTMLAnchorElement) => {
        const href = link.getAttribute('href')
        if (href) {
          try {
            const absoluteUrl = new URL(href, baseUrl)
            if (
              (absoluteUrl.protocol === 'http:' || absoluteUrl.protocol === 'https:') &&
              absoluteUrl.hostname === pageDomain
            ) {
              absoluteUrl.hash = ''
              uniqueHrefs.add(absoluteUrl.href)
            }
          } catch { /* ignore */ }
        }
      })
      return Array.from(uniqueHrefs)
    }, url)
    return links
  } catch (error: any) {
    console.error(`Could not find links on ${url}: ${error.message}`)
    return []
  }
}

/**
 * Filter for relevant internal pages (about, products, pricing, services)
 */
function filterRelevantLinks(links: string[]): string[] {
  const keywords = ['product', 'price', 'pricing', 'about', 'service', 'team', 'story', 'mission']
  return links.filter(link => {
    const lower = link.toLowerCase()
    return keywords.some(kw => lower.includes(kw))
  })
}

/**
 * Main scraper: launches browser, scrapes main page + relevant subpages
 */
export async function scrapeWebsite(url: string): Promise<ScrapedData> {
  let browser: Browser | null = null

  try {
    const config = await getBrowserConfig()
    browser = await puppeteer.launch(config)
    const page = await browser.newPage()
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    )

    // 1. Scrape main page with all data
    const mainData = await scrapePage(page, url)

    const result: ScrapedData = {
      text: mainData?.text || '',
      images: mainData?.images || [],
      fonts: mainData?.fonts || [],
      colors: mainData?.colors || {},
      additionalData: [],
    }

    // 2. Find and scrape relevant internal pages (text only, up to 3)
    const allLinks = await findInternalLinks(page, url)
    const relevant = filterRelevantLinks(allLinks).slice(0, 3)

    for (const link of relevant) {
      const sub = await scrapePage(page, link, {
        images: false,
        text: true,
        fonts: false,
        colors: false,
      })
      if (sub?.text) {
        result.additionalData.push({ text: sub.text.substring(0, 5000) })
      }
    }

    return result
  } catch (error: any) {
    console.error(`Scraper error for ${url}: ${error.message}`)
    throw error // Propagate so the API route can log the real error
  } finally {
    if (browser) {
      await browser.close().catch(() => {})
    }
  }
}
