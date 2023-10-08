import { scrapSinglePost } from './singlePost.js';
import { formatUrlToSlug } from './formatUrlToSlug.js';
import { debug } from './debug.js';


export const scrapPagination =  async function(browser, page, blogNavigation, blogContentSelectors, blogContent, isFirstPage = true) {
    console.log(`Página atual do blog: ${blogNavigation.pageNumber}`);
    if (blogNavigation.pageNumber > 1) {
        isFirstPage = false;
    }
    
    const nextPageButton = await page.waitForSelector(blogNavigation.nextPageButtonSelector);
    
    // // TODO - Using this as a case for debug mode
    if(blogNavigation.pageNumber < 2){
        await nextPageButton.click();
        console.log(blogNavigation.pageNumber)
        return;
    }

    const postLinks = await page.$$(blogContentSelectors.linkSelector);

    try {
        const postFeaturedImages = await page.waitForSelector(blogContentSelectors.featuredImageSelector, { timeout: 5000 });
    
        if (postFeaturedImages) {
            const featuredImageAttributes = await page.$$eval(blogContentSelectors.featuredImageSelector, (images, isFirstPage) => {
                const featuredImageAttribute = [...images].map(image => {
                    const imageInfo = {
                        "imageUrl": window.getComputedStyle(image).getPropertyValue('background-image'),
                        "alt": image.getAttribute('alt')
                    }

                    return imageInfo;
                });
                return featuredImageAttribute;

            }, isFirstPage);
            
            blogContent.altImage.push(...featuredImageAttributes.map(alt => alt.alt));
            blogContent.featuredImage.push(...featuredImageAttributes.map(alt => alt.imageUrl));
        }
        
    } catch (error) {
        console.error(error.message);
    }

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

    if (!nextPageButton) {
        throw new Error(`Element not found: ${pageNumber}`);
    }

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
            console.table([{'titulo': postTitles[i - titleCounter], 'Post Number': debug.currentPostNumber} ]) 
        }
        
        let postLink = postLinks[i];
        postLink = await page.evaluate(postLink => postLink.href, postLink);
        
        await scrapSinglePost(browser, postLink, blogContent, blogContentSelectors);


        await blogContent.slug.push(formatUrlToSlug(postLink));
        }
    
    blogContent.titles.push(...postTitles);
    blogContent.excerpts.push(...postExcerpts);
    blogContent.dates.push(...postDates);
    
    await nextPageButton.click();
}
