export const scrapSinglePost = async function(browser, postLink, blogContent, blogContentSelector) {

    const page = await browser.newPage();
    await page.goto(postLink);

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
        console.error(error.message)
    }

    try {
        const postContent = await page.waitForSelector(blogContentSelector.contentSelector, {timeout: 2000});
        if (postContent) {
            const content = await page.evaluate(postContent => postContent.innerHTML, postContent);
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
}