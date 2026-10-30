import {
	Options,
	parseAsArrayOf,
	parseAsString,
	useQueryState,
	UseQueryStateReturn,
} from 'nuqs';

const defaultNuqsOptions: Options = {
	history: 'push',
};

export const ALERT_RULES_PARAMS = {
	QUERY: 'query',
	STATES: 'states',
	VIEW: 'view',
	PAGE: 'page',
	RULE_TYPE: 'ruleType',
} as const;

export const useAlertRulesQuery = (): UseQueryStateReturn<string, string> =>
	useQueryState(
		ALERT_RULES_PARAMS.QUERY,
		parseAsString.withDefault('').withOptions(defaultNuqsOptions),
	);

export const useAlertRulesStates = (): UseQueryStateReturn<
	string[],
	string[]
> =>
	useQueryState(
		ALERT_RULES_PARAMS.STATES,
		parseAsArrayOf(parseAsString).withDefault([]).withOptions(defaultNuqsOptions),
	);
