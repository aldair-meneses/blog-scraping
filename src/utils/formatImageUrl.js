
export const formatImageUrl = (rawImageUrl) => {
    const formattedImageUrl = rawImageUrl.replace('url(', '').replace(')', '');
    return formattedImageUrl;
};
