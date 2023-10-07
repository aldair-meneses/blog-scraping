const puppeteer = require('puppeteer');
const json2csv = require('json2csv');
const fs = require('fs');

const debug = {
    currentPostNumber: 0
}

const baseUrl = 'https://safrasecifras.com.br';

const formatDates = (raw_date) => {

    const date = raw_date.replace('h', ':').split(',').join('');

    const [datePart, timePart] = date.split(' ');

    const [day, month, year] = datePart.split('/');

    const [hours, minutes] = timePart.split(':');

    const formattedDate = new Date(Date.UTC(year, month - 1, day, hours, minutes));

    return formattedDate;
}

// const fromatUrlToSlug = (url) => new URL(url).pathname.split('/').filter(Boolean).toString().slice(1);

const formatImageUrl = (rawImageUrl) => {
    const formattedImageUrl = rawImageUrl.replace('url(', '').replace(')', '');
    return formattedImageUrl;
}

async function scrapPagination(browser, page, blogNavigation, blogContentSelectors, blogContent, isFirstPage = true) {
    console.log(`Página atual do blog: ${blogNavigation.pageNumber}`);
    if (blogNavigation.pageNumber > 1) {
        isFirstPage = false;
    }
    
    const nextPageButton = await page.waitForSelector(blogNavigation.nextPageButtonSelector);
    
    // TODO - Using this as a case for debug mode
    // if(blogNavigation.pageNumber < 18){
    //     await nextPageButton.click();
    //     console.log(blogNavigation.pageNumber)
    //     return;
    // }

    const postLinks = await page.$$(blogContentSelectors.linkSelector);

    const postAltImages = await page.evaluate((isFirstPage, altImageSelector) => {
        const altImageClass = altImageSelector;
        const altImagesNodes = document.querySelectorAll(altImageClass);
        const postAltImages = [...altImagesNodes].map((altImagesNode) => altImagesNode.getAttribute('alt'));

        return isFirstPage ? postAltImages.slice(1) : postAltImages;
    }, isFirstPage, blogContentSelectors.imageSelector);

    const postFeaturedImages = await page.evaluate((isFirstPage, featuredImageSelector) => {
        const altImageClass = featuredImageSelector;
        const featuredImagesNodes = document.querySelectorAll(altImageClass);
        const postFeaturedImages = [...featuredImagesNodes].map((featuredImageNode) => {
            return window.getComputedStyle(featuredImageNode).getPropertyValue('background-image');
        })

        return isFirstPage ? postFeaturedImages.slice(1) : postFeaturedImages;
    }, isFirstPage, blogContentSelectors.imageSelector);

    const postTitles = await page.evaluate((page, isFirstPage, titleSelector) => {
        const titleClass = titleSelector;
        const titlesNodes = document.querySelectorAll(titleClass);
        const postTitles = [...titlesNodes].map((titleNode) => {
            return titleNode.textContent;
        });

        return isFirstPage ? postTitles.slice(1) : postTitles;

    }, page, isFirstPage, blogContentSelectors.titleSelector);

    const postExcerpts = await page.evaluate((isFirstPage, excerptSelector) => {
        const excerptClass = excerptSelector;
        const excerptNodes = document.querySelectorAll(excerptClass);
        const postExcerpts = [...excerptNodes].map(excerptNode => excerptNode.textContent);

        return isFirstPage ? postExcerpts.slice(1) : postExcerpts;
    }, isFirstPage, blogContentSelectors.excerptSelector);

    const postTags = await page.evaluate((tagSelector) => {
        const tagClass = tagSelector;
        const tagtNodes = document.querySelectorAll(tagClass);
        const postTags = [...tagtNodes].map(excerptNode => excerptNode.textContent);

        return postTags;
    }, blogContentSelectors.tagSelector);

    const postDates = await page.evaluate((isFirstPage, dateSelector) => {
        const dateClass = dateSelector;
        const dateNodes = document.querySelectorAll(dateClass);
        const postDates = [...dateNodes].map(dateNode => dateNode.textContent)

        return isFirstPage ? postDates.slice(1) : postDates;
    }, isFirstPage, blogContentSelectors.dateSelector)

    if (!nextPageButton) {
        throw new Error(`Element not found: ${pageNumber}`);
    }


    blogContent.titles.push(...postTitles);
    blogContent.excerpts.push(...postExcerpts);
    blogContent.tags.push(...postTags);
    blogContent.dates.push(...postDates);
    blogContent.altImage.push(...postAltImages);
    blogContent.featuredImage.push(...postFeaturedImages);

    for (let i = 0; i < postLinks.length; i++) {
        if (isFirstPage && i === 0) {
            continue;
        }
        let postLink = postLinks[i];
        postLink = await page.evaluate(postLink => postLink.href, postLink);
        
        await scrapAndCloseTab(browser, postLink, blogContent, blogContentSelectors);
        
        incrementDebugCurrentPostNumber();

        console.log(debug.currentPostNumber);

        await blogContent.slug.push(postLink);
        }
    
    await nextPageButton.click();
}

function incrementDebugCurrentPostNumber() {
    debug.currentPostNumber++;
}

async function scrapAndCloseTab(browser, postLink, blogContent, blogContentSelector) {
    // const slug = fromatUrlToSlug(postLink);
    const page = await browser.newPage();
    await page.goto(postLink);

    try {
        const postContent = await page.waitForSelector(blogContentSelector.contentSelector, {timeout: 5000});
        if (postContent) {
            const content = await page.evaluate(postContent => postContent.innerHTML, postContent);
            blogContent.content.push(content);
        } else {
            console.error('Selector not found. Skipping this post.');
        }
    } catch (error) {
        console.error('An error occurred while waiting for the selector:', error.message);      
        
        try {
            const videoContent = await page.waitForSelector(blogContentSelector.videoSelector, { timeout: 5000 });
            if (videoContent) {
                const content = await page.evaluate(videoContent => videoContent.querySelector('iframe').outerHTML, videoContent);
                blogContent.content.push(content);
            } else {
                console.error('Video selector also failed. Skipping this post.');
            }
        } catch (videoError) {
            console.error('Video selector failed:', videoError.message);
            console.error('Both selectors failed. Skipping this post.');
            blogContent.content.push('')
        }
    }
    
    await page.close();
}

(async () => {
    console.log('iniciando navegador...')
    console.time('\x1b[33mTempo de Execução Total: \x1b[0m')
    const browser = await puppeteer.launch({
        headless: 'new'
    });
    const page = await browser.newPage();

    await page.goto(`${baseUrl}/blog`);

    const blogContentSelectors = {
        titleSelector: '.PostCard__Title-sc-rfovt8-2',
        contentSelector: '.Post__Text-sc-1gmhq9c-10',
        excerptSelector: '.PostCard__Abstract-sc-rfovt8-6',
        tagSelector: '.Tag__TagText-sc-1fewlw3-1',
        dateSelector: '.PostCard__Info-sc-rfovt8-8.cTZaUT',
        imageSelector: '.PostCard__Thumbnail-sc-rfovt8-4',
        videoSelector: '.Video__PlayerWrapper-sc-1lmmn8o-1',
        linkSelector: '.PostCard__StyledTransitionLink-sc-rfovt8-7'
    }

    const blogNavigation = {
        pageNumber: 1,
        nextPageButtonSelector: '.Pagination__NextButtonNoSSR-sc-1q5sfry-8',
        postsPerPage: 6,
        lastPage: 77
    }

    const blogContent = {
        titles: [],
        content: [],
        excerpts: [],
        slug: [],
        tags: [],
        featuredImage: [],
        altImage: [],
        dates: [],
    };
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

            // if (result['slug']) {
            //     result['slug'] = fromatUrlToSlug(result['slug'])
            // }

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
