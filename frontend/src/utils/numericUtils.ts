<<<<<<< HEAD
import { isNumber } from 'lodash-es';

export function formatNumericValue(value: number | string): string {
	if (isNumber(value)) {
=======
export function formatNumericValue(value: number | string): string {
	if (typeof value !== 'number') {
>>>>>>> c1379f1cc (chore: add eslint rules for no-else-return and curly)
		return value.toString();
	}
	return (typeof value === 'string' ? parseFloat(value) : value).toFixed(3);
}
