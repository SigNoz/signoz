export function formatNumericValue(value: number | string): string {
	if (typeof value !== 'number') {
		return value.toString();
	}
	return (typeof value === 'string' ? parseFloat(value) : value).toFixed(3);
}
