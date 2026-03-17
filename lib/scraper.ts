/* eslint-disable @typescript-eslint/no-explicit-any */
import puppeteer from 'puppeteer-core'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const chromium = require('@sparticuz/chromium') as any

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

async function getBrowserConfig() {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL
  if (isProduction) {
    return {
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    }
  }
  // Local dev: try common Chrome/Chromium paths
  const paths = [
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
    process.env.CHROME_PATH,
  ].filter(Boolean) as string[]

  let executablePath = paths[0]
  for (const p of paths) {
    try {
      const { existsSync } = await import('fs')
      if (existsSync(p)) {
        executablePath = p
        break
      }
    } catch { /* continue */ }
  }

  return {
    headless: true,
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  }
}

async function scrapePage(
  page: any,
  url: string,
  options = { images: true, text: true, fonts: true, colors: true }
) {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })

    let imagesData: any[] = []
    let visibleText = ''
    let fontsData: string[] = []
    let colorData: any = { specifics: {}, palette: [] }

    if (options.images) {
      imagesData = await page.evaluate((pageUrl: string) => {
        const allImages = document.querySelectorAll('img')
        const data: any[] = []
        allImages.forEach((img: HTMLImageElement) => {
          const src = img.getAttribute('src')
          const alt = img.getAttribute('alt') || 'No alt text'
          if (src) {
            try {
              const absoluteUrl = new URL(src, pageUrl)
              data.push({ link: absoluteUrl.href, title: alt.trim() })
            } catch { /* ignore */ }
          }
        })
        return data
      }, url)
    }

    if (options.text) {
      visibleText = await page.evaluate(() => {
        document.querySelectorAll('script, style').forEach((el: Element) => el.remove())
        return document.body.innerText
      })
      visibleText = visibleText.replace(/\s+/g, ' ').trim()
    }

    if (options.fonts) {
      fontsData = await page.evaluate(() => {
        const allElements = document.querySelectorAll('*')
        const fontFamilies = new Set<string>()
        allElements.forEach((el: Element) => {
          const style = window.getComputedStyle(el)
          fontFamilies.add(style.getPropertyValue('font-family'))
        })
        return Array.from(fontFamilies)
      })
    }

    if (options.colors) {
      colorData = await page.evaluate(() => {
        const results: any = { specifics: {}, palette: new Set() }
        const getStyles = (el: Element | null) => {
          if (!el) return null
          const style = window.getComputedStyle(el)
          return {
            text_color: style.getPropertyValue('color'),
            background_color: style.getPropertyValue('background-color'),
            border_color: style.getPropertyValue('border-color'),
          }
        }
        results.specifics.body = getStyles(document.querySelector('body'))
        results.specifics.h1 = getStyles(document.querySelector('h1'))
        results.specifics.h2 = getStyles(document.querySelector('h2'))
        results.specifics.link = getStyles(document.querySelector('a'))
        const buttonEl = document.querySelector('button, [class*="btn"], a[role="button"]')
        results.specifics.button = getStyles(buttonEl)

        const allElements = document.querySelectorAll('*')
        allElements.forEach((el: Element) => {
          const style = window.getComputedStyle(el)
          const color = style.getPropertyValue('color')
          const bgColor = style.getPropertyValue('background-color')
          if (color && color !== 'rgba(0, 0, 0, 0)') results.palette.add(color)
          if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)') results.palette.add(bgColor)
        })
        results.palette = Array.from(results.palette)
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

async function findInternalLinks(page: any, url: string): Promise<Set<string>> {
  const internalLinks = new Set<string>()
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
    const linksOnPage = await page.evaluate((baseUrl: string) => {
      const allLinks = document.querySelectorAll('a')
      const uniqueHrefs = new Set<string>()
      const pageDomain = new URL(baseUrl).hostname
      allLinks.forEach((link: HTMLAnchorElement) => {
        const href = link.getAttribute('href')
        if (href) {
          try {
            const absoluteUrl = new URL(href, baseUrl)
            if (absoluteUrl.protocol !== 'http:' && absoluteUrl.protocol !== 'https:') return
            if (absoluteUrl.hostname !== pageDomain) return
            absoluteUrl.hash = ''
            uniqueHrefs.add(absoluteUrl.href)
          } catch { /* ignore */ }
        }
      })
      return Array.from(uniqueHrefs)
    }, url)
    linksOnPage.forEach((link: string) => internalLinks.add(link))
  } catch (error: any) {
    console.error(`Could not find links on ${url}: ${error.message}`)
  }
  return internalLinks
}

function filterRelevantLinks(links: string[]): string[] {
  const keywords = ['product', 'price', 'pricing', 'about', 'service']
  return links.filter((link) => {
    const lowercaseLink = link.toLowerCase()
    return keywords.some((keyword) => lowercaseLink.includes(keyword))
  })
}

export async function scrapeWebsiteWithRelevantLinks(url: string): Promise<ScrapedData> {
  let browser
  try {
    const browserConfig = await getBrowserConfig()
    browser = await puppeteer.launch(browserConfig as any)
    const page = await browser.newPage()
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    )

    // 1. Find all internal links
    const allLinks = await findInternalLinks(page, url)
    const linksArray: string[] = []
    allLinks.forEach((link) => linksArray.push(link))
    const relevantLinks = filterRelevantLinks(linksArray)

    // 2. Scrape main page with full data
    let data = await scrapePage(page, url, {
      images: true,
      text: true,
      fonts: true,
      colors: true,
    })

    const safeData = data || { images: [], text: '', fonts: [], colors: {} }

    const result: ScrapedData = {
      text: safeData.text || '',
      images: safeData.images || [],
      fonts: safeData.fonts || [],
      colors: safeData.colors || {},
      additionalData: [],
    }

    // 3. Scrape relevant links (text only)
    for (let i = 0; i < Math.min(relevantLinks.length, 3); i++) {
      const link = relevantLinks[i]
      const response = await scrapePage(page, link, {
        images: false,
        text: true,
        fonts: false,
        colors: false,
      })
      if (response?.text) {
        result.additionalData.push({ text: response.text })
      }
    }

    return result
  } catch (error: any) {
    console.error(`Error in scrapeWebsiteWithRelevantLinks: ${error.message}`)
    // Return empty data on error
    return { text: '', images: [], fonts: [], colors: {}, additionalData: [] }
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

/**
 * Lightweight fallback scraper using fetch + cheerio (no browser needed)
 */
export async function scrapeWebsiteLightweight(url: string): Promise<ScrapedData> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const html = await response.text()
    const cheerio = await import('cheerio')
    const $ = cheerio.load(html)

    // Remove scripts and styles
    $('script, style, noscript').remove()

    // Extract text
    const text = $('body').text().replace(/\s+/g, ' ').trim()

    // Extract images
    const images: { link: string; title: string }[] = []
    $('img').each((_, el) => {
      const src = $(el).attr('src')
      const alt = $(el).attr('alt') || 'No alt text'
      if (src) {
        try {
          const absoluteUrl = new URL(src, url)
          images.push({ link: absoluteUrl.href, title: alt.trim() })
        } catch { /* ignore */ }
      }
    })

    // Extract font references from CSS links and inline styles
    const fonts: string[] = []
    $('link[href*="fonts"]').each((_, el) => {
      const href = $(el).attr('href')
      if (href) fonts.push(href)
    })

    // Try to scrape about page for more context
    const additionalData: { text: string }[] = []
    const aboutLinks: string[] = []
    $('a').each((_, el) => {
      const href = $(el).attr('href')
      if (href) {
        const lower = href.toLowerCase()
        if (lower.includes('about') || lower.includes('product') || lower.includes('pricing')) {
          try {
            const absUrl = new URL(href, url)
            if (absUrl.hostname === new URL(url).hostname) {
              aboutLinks.push(absUrl.href)
            }
          } catch { /* ignore */ }
        }
      }
    })

    // Scrape up to 2 additional pages
    const uniqueAboutLinks: string[] = []
    const seenLinks = new Set<string>()
    for (const l of aboutLinks) {
      if (!seenLinks.has(l)) {
        seenLinks.add(l)
        uniqueAboutLinks.push(l)
      }
    }
    for (let i = 0; i < Math.min(uniqueAboutLinks.length, 2); i++) {
      const link = uniqueAboutLinks[i]
      try {
        const subRes = await fetch(link, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(10000),
        })
        if (subRes.ok) {
          const subHtml = await subRes.text()
          const $sub = cheerio.load(subHtml)
          $sub('script, style, noscript').remove()
          const subText = $sub('body').text().replace(/\s+/g, ' ').trim()
          if (subText) {
            additionalData.push({ text: subText.substring(0, 5000) })
          }
        }
      } catch { /* ignore */ }
    }

    return {
      text: text.substring(0, 15000),
      images: images.slice(0, 20),
      fonts,
      colors: {},
      additionalData,
    }
  } catch (error: any) {
    console.error(`Lightweight scrape failed for ${url}: ${error.message}`)
    return { text: '', images: [], fonts: [], colors: {}, additionalData: [] }
  }
}

/**
 * Main entry point: tries puppeteer first, falls back to lightweight
 */
export async function scrapeWebsite(url: string): Promise<ScrapedData> {
  try {
    return await scrapeWebsiteWithRelevantLinks(url)
  } catch (error: any) {
    console.warn(`Puppeteer scraping failed, falling back to lightweight: ${error.message}`)
    return await scrapeWebsiteLightweight(url)
  }
}
