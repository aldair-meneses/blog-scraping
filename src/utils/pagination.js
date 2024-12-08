import { scrapSinglePost } from './singlePost.js';
import { formatUrlToSlug } from './formatUrlToSlug.js';
import { debug } from './debug.js';

export const scrapPagination =  async function(browser, page, blogNavigation, blogContentSelectors, blogContent, isFirstPage = false) {
    await page.waitForNetworkIdle({ idleTime: 500 });
    console.log(`Página atual do blog: ${blogNavigation.pageNumber}`);

    // FIX: Rethink this. This causes a bug because was implemented to deal with blog that have first post as a featured post. 
    // Its causing the first post to be skipped.
    if (blogNavigation.pageNumber > 1) {
        isFirstPage = false;
    }

    // WARNING - Uncomment this for debugging purposes
    // if(blogNavigation.pageNumber < 4){
    //     await nextPageButton.click();
    //     console.log(blogNavigation.pageNumber)
    //     return;
    // }
    
    const currentPageHref = await page.evaluate(() => window.location.href);
    console.log(`Current page URL: ${currentPageHref}`);
    const postLinks = await page.$$(blogContentSelectors.linkSelector);

    const postFeaturedImages = await page.evaluate((isFirstPage, featuredImageSelector) => {
        const images = Array.from(new Set(document.querySelectorAll(featuredImageSelector)));
        const featuredImageAttributes = images.map(image => {
            let imageUrl = window.getComputedStyle(image).getPropertyValue('background-image');
            debugger;
            if (!imageUrl || imageUrl === 'none') {
                imageUrl = image.getAttribute('src');
            }
            const imageInfo = {
                "imageUrl": imageUrl,
                "alt": image.getAttribute('alt')
            };

            return imageInfo;
        });

        return featuredImageAttributes;

    }, isFirstPage, blogContentSelectors.featuredImageSelector);
    

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

    const postDates = await page.evaluate((isFirstPage, dateSelector) => {
        const dateClass = dateSelector;
        const dateNodes = document.querySelectorAll(dateClass);
        const postDates = [...dateNodes].map(dateNode => dateNode.textContent)

        return isFirstPage ? postDates.slice(1) : postDates;
    }, isFirstPage, blogContentSelectors.dateSelector)

    const postCategories = await page.evaluate((isFirstPage, categorySelector) => {
        const categoryClass = categorySelector;
        const categoryNodes = document.querySelectorAll(categoryClass);
        const postCategories = [...categoryNodes].map(categoyNode => categoyNode.textContent)

        return isFirstPage ? postCategories.slice(1) : postCategories;
    }, isFirstPage, blogContentSelectors.categorySelector)
    
    for (let i = 0; i < postLinks.length; i++) {
        
        let titleCounter = 1 
        
        if (isFirstPage && i === 0) {
            continue;
        }
        
        if (blogNavigation.pageNumber > 1 ) {
            titleCounter = 0
        }
        
        if (i <= blogNavigation.postsPerPage) {
            debug.currentPostNumber++
            console.table([{'titulo': postTitles[i], 'Post Number': debug.currentPostNumber} ]) 
        }
        
        let postLink = postLinks[i];
        postLink = await page.evaluate(postLink => postLink.href, postLink);
        
        await scrapSinglePost(browser, postLink, blogContent, blogContentSelectors);
        
        await blogContent.slug.push(formatUrlToSlug(postLink));
    }
    
    blogContent.titles.push(...postTitles);
    blogContent.excerpts.push(...postExcerpts);
    blogContent.dates.push(...postDates);
    blogContent.categories.push(...postCategories);
    blogContent.altImage.push(...postFeaturedImages.map(image => image.alt));
    blogContent.featuredImage.push(...postFeaturedImages.map(image => image.imageUrl));

    if (blogNavigation.pageNumber === blogNavigation.lastPage) {
        return;
    }

    const nextPageButton = await page.waitForSelector(blogNavigation.nextPageButtonSelector, { timeout: 5000 });

    if (!nextPageButton) {
        throw new Error(`Element not found: ${pageNumber}`);
    }

    await nextPageButton.click();
    await page.waitForNetworkIdle({ idleTime: 500 });
    return;
}
