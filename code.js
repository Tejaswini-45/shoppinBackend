const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

const productPatterns = [/\/product\//, /\/item\//, /\/p\//];
git
async function fetchHTML(url) {
    try {
        const { data } = await axios.get(url);
        return data;
    } catch (error) {
        console.error(`Failed to fetch URL: ${url}`, error.message);
        return null;
    }
}

async function extractProductLinks(html, baseURL) {
    const $ = cheerio.load(html);
    const links = new Set();

    $('a').each((_, element) => {
        const href = $(element).attr('href');
        if (href && productPatterns.some(pattern => pattern.test(href))) {
            const absoluteURL = new URL(href, baseURL).href;
            links.add(absoluteURL);
        }
    });

    return Array.from(links);
}

async function handleInfiniteScrolling(url) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: 'networkidle2' });
    let previousHeight = 0;

    try {
        while (true) {
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await page.waitForTimeout(2000);
            const currentHeight = await page.evaluate(() => document.body.scrollHeight);

            if (currentHeight === previousHeight) break;
            previousHeight = currentHeight;
        }

        const content = await page.content();
        await browser.close();
        return content;
    } catch (error) {
        console.error(`Failed to handle infinite scrolling for ${url}`, error.message);
        await browser.close();
        return null;
    }
}

async function crawlDomains(domains) {
    const results = {};

    for (const domain of domains) {
        console.log(`Crawling: ${domain}`);
        const html = await fetchHTML(domain);
        const dynamicContent = await handleInfiniteScrolling(domain);

        const links = html ? await extractProductLinks(html, domain) : [];
        const dynamicLinks = dynamicContent ? await extractProductLinks(dynamicContent, domain) : [];

        results[domain] = Array.from(new Set([...links, ...dynamicLinks]));
    }

    console.log(JSON.stringify(results, null, 2));
}

const domains = ['https://example1.com', 'https://example2.com'];
crawlDomains(domains);
