import { blogContent } from './src/models/contentData.js';
import { blogContentSelectors } from './src/models/blogSelectors.js';
import { blogNavigation } from './src/models/blogSelectors.js';
import { scrapPagination } from './src/utils/pagination.js';

import { formatDates } from './src/utils/dateFormat.js';
import { formatImageUrl } from './src/utils/formatImageUrl.js';
import { blog } from './src/models/blogSelectors.js';

import puppeteer from 'puppeteer';
import json2csv from 'json2csv';
import fs from 'fs';

(async () => {
    console.log('iniciando navegador...')
    console.time('\x1b[33mTempo de Execução Total: \x1b[0m')
    const browser = await puppeteer.launch({
        headless: 'new'
    });
    const page = await browser.newPage();

    await page.goto(`${blog.baseUrl}/blog`);
    
    console.log('iniciando scraping...')
    for (blogNavigation.pageNumber; blogNavigation.pageNumber <= blogNavigation.lastPage; blogNavigation.pageNumber++) {
        await scrapPagination(browser, page, blogNavigation, blogContentSelectors, blogContent);
    }

    const data = blogContent.titles.map((title, index) => {
        const combinedData = Object.keys(blogContent).reduce((result, key) => {
            result[key] = blogContent[key][index];

            if (result['dates']) {
                result['dates'] = formatDates(result['dates']);
            }

            if (result['featuredImage']) {
                result['featuredImage'] = formatImageUrl(result['featuredImage']);
            }

            return result;
        }, {});

        return combinedData;
    });

    const csv = json2csv.parse(data);

    fs.writeFileSync('output.csv', csv, 'utf-8');

    console.log('CSV gerado com sucesso!');

    await browser.close();

    console.timeEnd('\x1b[33mTempo de Execução Total: \x1b[0m')
})();
