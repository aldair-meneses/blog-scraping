
export const formatDates = (raw_date) => {

    const date = raw_date.replace('h', ':').split(',').join('');

    const [datePart, timePart] = date.split(' ');

    const [day, month, year] = datePart.split('/');

    const [hours, minutes] = timePart.split(':');

    const formattedDate = new Date(Date.UTC(year, month - 1, day, hours, minutes));

    return formattedDate;
};
