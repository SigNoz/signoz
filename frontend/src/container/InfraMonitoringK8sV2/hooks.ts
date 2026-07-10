import {
	createParser,
	Options,
	parseAsInteger,
	parseAsJson,
	parseAsString,
	useQueryState,
	UseQueryStateReturn,
} from 'nuqs';
import {
	IBuilderQuery,
	TagFilter,
} from 'types/api/queryBuilder/queryBuilderData';
import { parseAsJsonNoValidate } from 'utils/nuqsParsers';

import {
	INFRA_MONITORING_K8S_PARAMS_KEYS,
	K8sCategories,
	VIEWS,
} from './constants';
import { orderBySchema, OrderBySchemaType } from './schemas';

export type StatusFilterValue = 'active' | 'inactive';

const defaultNuqsOptions: Options = {
	history: 'push',
};

export const useInfraMonitoringPageListing = (): UseQueryStateReturn<
	number,
	number | undefined
> =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.PAGE,
		parseAsInteger.withOptions(defaultNuqsOptions),
	);

export const useInfraMonitoringOrderBy = (): UseQueryStateReturn<
	OrderBySchemaType,
	OrderBySchemaType
> =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.ORDER_BY,
		parseAsJson(orderBySchema).withOptions(defaultNuqsOptions),
	);

const parseAsGroupBy = createParser<string[]>({
	parse: (value: string): string[] | null => {
		try {
			const parsed = JSON.parse(value);
			if (!Array.isArray(parsed)) {
				return null;
			}
			return parsed
				.map((item: unknown) => {
					if (typeof item === 'string') {
						return item;
					}
					if (item && typeof item === 'object' && 'key' in item) {
						return String((item as { key: unknown }).key);
					}
					return '';
				})
				.filter(Boolean);
		} catch {
			return null;
		}
	},
	serialize: (value: string[]): string => JSON.stringify(value),
	eq: (a: string[], b: string[]): boolean =>
		JSON.stringify(a) === JSON.stringify(b),
});

export const useInfraMonitoringGroupBy = (): UseQueryStateReturn<
	string[],
	[]
> =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.GROUP_BY,
		parseAsGroupBy.withDefault([]).withOptions(defaultNuqsOptions),
	);

export const useInfraMonitoringView = (): UseQueryStateReturn<string, string> =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.VIEW,
		parseAsString.withDefault(VIEWS.METRICS).withOptions(defaultNuqsOptions),
	);

export const useInfraMonitoringLogFilters = (): UseQueryStateReturn<
	TagFilter,
	undefined
> =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.LOG_FILTERS,
		parseAsJsonNoValidate<IBuilderQuery['filters']>().withOptions(
			defaultNuqsOptions,
		),
	);

export const useInfraMonitoringTracesFilters = (): UseQueryStateReturn<
	TagFilter,
	undefined
> =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.TRACES_FILTERS,
		parseAsJsonNoValidate<IBuilderQuery['filters']>().withOptions(
			defaultNuqsOptions,
		),
	);

export const useInfraMonitoringEventsFilters = (): UseQueryStateReturn<
	TagFilter,
	undefined
> =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.EVENTS_FILTERS,
		parseAsJsonNoValidate<IBuilderQuery['filters']>().withOptions(
			defaultNuqsOptions,
		),
	);

export const useInfraMonitoringCategory = (): UseQueryStateReturn<
	string,
	string
> =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.CATEGORY,
		parseAsString.withDefault(K8sCategories.PODS).withOptions(defaultNuqsOptions),
	);

export const useInfraMonitoringSelectedItem = (): UseQueryStateReturn<
	string,
	string | undefined
> => {
	return useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.SELECTED_ITEM,
		parseAsString,
	);
};

export const useInfraMonitoringStatusFilter = (): UseQueryStateReturn<
	string,
	string
> =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.STATUS_FILTER,
		parseAsString.withDefault('').withOptions(defaultNuqsOptions),
	);
