export const formatWixImageUrl = (rawImageUrl) => {
    let imageUrlParts = rawImageUrl.split('/v1/');
    let formattedImageUrl;
    if (imageUrlParts.length > 0) {
        formattedImageUrl = imageUrlParts[0];
        return formattedImageUrl;
    }
    return rawImageUrl;
};
