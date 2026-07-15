import {
	Options,
	parseAsString,
	parseAsStringLiteral,
	useQueryState,
	UseQueryStateReturn,
} from 'nuqs';
import { parseAsJsonNoValidate } from 'utils/nuqsParsers';

const defaultNuqsOptions: Options = {
	history: 'push',
};

export const TIMELINE_TABLE_PARAMS = {
	CURSOR: 'cursor',
	CURSOR_HISTORY: 'cursorHistory',
	ORDER: 'order',
} as const;

const ORDER_VALUES = ['asc', 'desc'] as const;
export type OrderDirection = (typeof ORDER_VALUES)[number];

export const useTimelineTableCursor = (): UseQueryStateReturn<
	string,
	undefined
> =>
	useQueryState(
		TIMELINE_TABLE_PARAMS.CURSOR,
		parseAsString.withOptions(defaultNuqsOptions),
	);

export const useTimelineTableCursorHistory = (): UseQueryStateReturn<
	string[],
	string[]
> =>
	useQueryState(
		TIMELINE_TABLE_PARAMS.CURSOR_HISTORY,
		parseAsJsonNoValidate<string[]>()
			.withDefault([])
			.withOptions(defaultNuqsOptions),
	);

export const useTimelineTableOrder = (): UseQueryStateReturn<
	OrderDirection,
	OrderDirection
> =>
	useQueryState(
		TIMELINE_TABLE_PARAMS.ORDER,
		parseAsStringLiteral(ORDER_VALUES)
			.withDefault('desc')
			.withOptions(defaultNuqsOptions),
	);
