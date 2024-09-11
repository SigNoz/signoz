export const extractDayFromTimestamp = (timestamp: string | null): string => {
	if (!timestamp) return '';
	const date = new Date(parseInt(timestamp, 10));
	return date.getDate().toString();
};

export const convertTimestampToLocaleDateString = (
	timestamp: string | null,
): string => {
	if (!timestamp) return '';
	return new Date(parseInt(timestamp, 10)).toLocaleString();
};
