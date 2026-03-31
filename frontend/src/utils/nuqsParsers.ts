import { createParser, SingleParserBuilder } from 'nuqs';

export function parseAsJsonNoValidate<T = unknown>(): SingleParserBuilder<T> {
	return createParser<T>({
		parse: (query: string): T | null => {
			try {
				return JSON.parse(query) as T;
			} catch {
				return null;
			}
		},
		serialize: (value: T): string => JSON.stringify(value),
		eq: (a: T, b: T): boolean =>
			a === b || JSON.stringify(a) === JSON.stringify(b),
	});
}
