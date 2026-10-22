import {
	Options,
	parseAsInteger,
	parseAsStringLiteral,
	useQueryState,
	UseQueryStateReturn,
} from 'nuqs';
import { TIMELINE_TABLE_PAGE_SIZE } from 'container/AlertHistory/constants';

const defaultNuqsOptions: Options = {
	history: 'push',
};

export const TIMELINE_TABLE_PARAMS = {
	PAGE: 'page',
	ORDER: 'order',
} as const;

const ORDER_VALUES = ['asc', 'desc'] as const;
export type OrderDirection = (typeof ORDER_VALUES)[number];

export const useTimelineTablePage = (): UseQueryStateReturn<number, number> =>
	useQueryState(
		TIMELINE_TABLE_PARAMS.PAGE,
		parseAsInteger.withDefault(1).withOptions(defaultNuqsOptions),
	);

export const useTimelineTableOrder = (): UseQueryStateReturn<
	OrderDirection,
	OrderDirection
> =>
	useQueryState(
		TIMELINE_TABLE_PARAMS.ORDER,
		parseAsStringLiteral(ORDER_VALUES)
			.withDefault('asc')
			.withOptions(defaultNuqsOptions),
	);

export function encodeCursor(page: number, limit: number): string | undefined {
	if (page <= 1) {
		return undefined;
	}
	const offset = (page - 1) * limit;
	// Backend uses base64.RawURLEncoding (URL-safe, no padding)
	return btoa(JSON.stringify({ offset, limit }))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

export function computeCursorForPage(page: number): string | undefined {
	return encodeCursor(page, TIMELINE_TABLE_PAGE_SIZE);
}
