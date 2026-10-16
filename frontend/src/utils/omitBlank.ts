import { isEmpty, isNil, omitBy } from 'lodash-es';

/**
 * Drops the keys a user never filled in, so a caller sends nothing rather than
 * an empty value. `false` and `0` are kept: they are choices, not blanks.
 */
export function omitBlank<T extends Record<string, unknown>>(
	source: T,
): Partial<T> {
	return omitBy(
		source,
		(value) =>
			isNil(value) ||
			value === '' ||
			((Array.isArray(value) || typeof value === 'object') && isEmpty(value)),
	) as Partial<T>;
}
