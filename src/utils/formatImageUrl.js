export const formatImageUrl = (rawImageUrl) => {
    let formattedImageUrl = rawImageUrl.replace('url(', '').replace(')', '');
    const urlParts = formattedImageUrl.split('/v1/');
    if (urlParts) {
        formattedImageUrl = urlParts[0];
    }
    return formattedImageUrl;
};
