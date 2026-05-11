import {
	Options,
	parseAsInteger,
	useQueryState,
	UseQueryStateReturn,
} from 'nuqs';
import { parseAsJsonNoValidate } from 'utils/nuqsParsers';

const defaultNuqsOptions: Options = {
	history: 'push',
};

export const ALERT_RULES_PARAMS = {
	SEARCH: 'search',
	PAGE: 'page',
	RULE_TYPE: 'ruleType',
	FILTERS: 'alertRulesFilters',
} as const;

export const useAlertRulesPage = (): UseQueryStateReturn<number, number> =>
	useQueryState(
		ALERT_RULES_PARAMS.PAGE,
		parseAsInteger.withDefault(1).withOptions(defaultNuqsOptions),
	);

export const useAlertRulesRuleType = (): UseQueryStateReturn<
	string[],
	string[]
> =>
	useQueryState(
		ALERT_RULES_PARAMS.RULE_TYPE,
		parseAsJsonNoValidate<string[]>()
			.withDefault([])
			.withOptions(defaultNuqsOptions),
	);

export const useAlertRulesFilters = (): UseQueryStateReturn<
	string[],
	string[]
> =>
	useQueryState(
		ALERT_RULES_PARAMS.FILTERS,
		parseAsJsonNoValidate<string[]>()
			.withDefault([])
			.withOptions(defaultNuqsOptions),
	);
