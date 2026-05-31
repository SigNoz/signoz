import { Options, useQueryState, UseQueryStateReturn } from 'nuqs';
import { parseAsJsonNoValidate } from 'utils/nuqsParsers';

const defaultNuqsOptions: Options = {
	history: 'push',
};

export const TRIGGERED_ALERTS_PARAMS = {
	FILTERS: 'alertFilters',
	GROUP_BY: 'groupBy',
	SEARCH: 'search',
} as const;

export const useTriggeredAlertsFilters = (): UseQueryStateReturn<
	string[],
	string[]
> =>
	useQueryState(
		TRIGGERED_ALERTS_PARAMS.FILTERS,
		parseAsJsonNoValidate<string[]>()
			.withDefault([])
			.withOptions(defaultNuqsOptions),
	);

export const useTriggeredAlertsGroupBy = (): UseQueryStateReturn<
	string[],
	string[]
> =>
	useQueryState(
		TRIGGERED_ALERTS_PARAMS.GROUP_BY,
		parseAsJsonNoValidate<string[]>()
			.withDefault([])
			.withOptions(defaultNuqsOptions),
	);
