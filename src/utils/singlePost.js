import { formatWixImageUrl } from "../custom-formaters/formatWixImage.js";

export const scrapSinglePost = async function(browser, postLink, blogContent, blogContentSelector) {

    const page = await browser.newPage();
    await page.goto(postLink);

    try {
        const metaDescription = await page.$eval('meta[name="description"]', element => element.getAttribute('content'));
        if (metaDescription) {
            blogContent.metaDescription.push(metaDescription);
        }
    } catch (error) { 
        console.error('An error occurred while getting the meta description:', error.message);
    }

    try {
        const seoTitle = await page.$eval('title', element => element.textContent);
        if (seoTitle) {
            blogContent.seoTitle.push(seoTitle);
        }
    } catch (error) {
        console.error('An error occurred while getting the SEO title:', error.message);
    }

    try {
        const postTags = await page.waitForSelector(blogContentSelector.tagsSelector, {timeout: 2000});
        if (postTags) {
            const tags = await page.evaluate((postTags) => {
                const tagsChildsNode = postTags.children;
                return [...tagsChildsNode].map(tag => tag.textContent).join(', ');
            }, postTags)
            blogContent.tags.push(tags)
        }
    }  catch (error) {
        console.error('An error ocurred while getting the tags, any tags found for this post. \n', error.message);
    }

    try {
        const postContent = await page.waitForSelector(blogContentSelector.contentSelector, {timeout: 2000});
        if (postContent) {
            await page.exposeFunction('formatWixImageUrl', formatWixImageUrl);
            const content = await page.evaluate((blogContentSelector) => {
                document.querySelectorAll('[data-hook="imageViewer"]').forEach(imageViewerElement => {
                    const img = imageViewerElement.querySelector('img');
                    if (img) {
                        let imageUrlParts = img.src.split('/v1/');
                        if (imageUrlParts.length > 0) {
                            img.src = imageUrlParts[0];
                        }
                        imageViewerElement.parentNode.replaceChild(img, imageViewerElement);
                    }
                });
                
                return document.querySelector(blogContentSelector.contentSelector).innerHTML;
            }, blogContentSelector);
            blogContent.content.push(content);
        }
    } catch (error) {
        console.error('An error occurred while waiting for the selector:', error.message);   
        console.log('Trying to find a video selector...')   
        
        try {
            const videoContent = await page.waitForSelector(blogContentSelector.videoSelector, { timeout: 2000 });
            if (videoContent) {
                const content = await page.evaluate(videoContent => videoContent.querySelector('iframe').outerHTML, videoContent);
                blogContent.content.push(content);
            } 
        } catch (videoError) {
            console.error('Video selector failed:', videoError.message);
            console.error('Both selectors failed. Skipping this post.');
            blogContent.content.push('')
        }
    }
    
    await page.close();
    return;
}