import { useMemo } from 'react';
import { VIEWS } from 'components/HostMetricsDetail/constants';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import {
	Options,
	parseAsInteger,
	parseAsJson,
	parseAsString,
	useQueryState,
	UseQueryStateReturn,
} from 'nuqs';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	IBuilderQuery,
	TagFilter,
} from 'types/api/queryBuilder/queryBuilderData';
import { parseAsJsonNoValidate } from 'utils/nuqsParsers';

import { INFRA_MONITORING_K8S_PARAMS_KEYS, K8sCategories } from './constants';
import { orderBySchema, OrderBySchemaType } from './schemas';

const defaultFilters: IBuilderQuery['filters'] = { items: [], op: 'and' };
const defaultNuqsOptions: Options = {
	history: 'push',
};

export const useInfraMonitoringCurrentPage = (): UseQueryStateReturn<
	number,
	number
> =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.CURRENT_PAGE,
		parseAsInteger.withDefault(1).withOptions(defaultNuqsOptions),
	);

export const useInfraMonitoringOrderBy = (): UseQueryStateReturn<
	OrderBySchemaType,
	OrderBySchemaType
> =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.ORDER_BY,
		parseAsJson(orderBySchema).withOptions(defaultNuqsOptions),
	);

export const useInfraMonitoringOrderByHosts = (): UseQueryStateReturn<
	OrderBySchemaType,
	OrderBySchemaType
> =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.ORDER_BY,
		parseAsJson(orderBySchema)
			.withDefault({
				columnName: 'cpu',
				order: 'desc',
			})
			.withOptions(defaultNuqsOptions),
	);

export const useInfraMonitoringGroupBy = (): UseQueryStateReturn<
	BaseAutocompleteData[],
	[]
> =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.GROUP_BY,
		parseAsJsonNoValidate<IBuilderQuery['groupBy']>()
			.withDefault([])
			.withOptions(defaultNuqsOptions),
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

export const useInfraMonitoringFilters = (): UseQueryStateReturn<
	string,
	string
> =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.FILTERS,
		parseAsString.withDefault('').withOptions(defaultNuqsOptions),
	);

export const useInfraMonitoringFiltersK8s = (): UseQueryStateReturn<
	TagFilter,
	undefined
> =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.FILTERS,
		parseAsJsonNoValidate<TagFilter>().withOptions(defaultNuqsOptions),
	);

export const useInfraMonitoringFiltersHosts = (): UseQueryStateReturn<
	TagFilter,
	TagFilter | undefined
> =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.FILTERS,
		parseAsJsonNoValidate<IBuilderQuery['filters']>()
			.withDefault(defaultFilters)
			.withOptions(defaultNuqsOptions),
	);

export const useInfraMonitoringQueryFilters = (): TagFilter => {
	const { currentQuery } = useQueryBuilder();

	return useMemo(
		() =>
			currentQuery?.builder?.queryData[0]?.filters || {
				items: [],
				op: 'and',
			},
		[currentQuery?.builder?.queryData],
	);
};

export const useInfraMonitoringSelectedItem = (): UseQueryStateReturn<
	string,
	string | undefined
> => {
	return useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.SELECTED_ITEM,
		parseAsString,
	);
};
