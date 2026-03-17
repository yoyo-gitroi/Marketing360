/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for puppeteer-core and @sparticuz/chromium to work in Vercel serverless functions
  serverExternalPackages: ['puppeteer-core', '@sparticuz/chromium'],
};

module.exports = nextConfig;
