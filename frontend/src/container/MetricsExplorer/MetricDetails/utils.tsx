export function formatTimestampToReadableDate(timestamp: string): string {
	const date = new Date(timestamp);
	// Extracting date components
	const day = String(date.getDate()).padStart(2, '0');
	const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
	const year = String(date.getFullYear()).slice(-2); // Get last two digits of year

	// Extracting time components
	const hours = String(date.getHours()).padStart(2, '0');
	const minutes = String(date.getMinutes()).padStart(2, '0');
	const seconds = String(date.getSeconds()).padStart(2, '0');

	return `${day}.${month}.${year} ⎯ ${hours}:${minutes}:${seconds}`;
}

export function formatNumberToCompactFormat(num: number): string {
	return new Intl.NumberFormat('en-US', {
		notation: 'compact',
		maximumFractionDigits: 1,
	}).format(num);
}
