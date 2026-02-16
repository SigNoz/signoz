import isNumber from 'lodash-es/isNumber';

export function formatNumericValue(value: number | string): string {
	if (isNumber(value)) {
		return value.toString();
	}
	return (typeof value === 'string' ? parseFloat(value) : value).toFixed(3);
}
