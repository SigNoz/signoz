import {
	createParser,
	Options,
	parseAsInteger,
	parseAsJson,
	parseAsString,
	useQueryState,
	useQueryStates,
	UseQueryStateReturn,
} from 'nuqs';
import { useCallback, useMemo } from 'react';
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

export interface SelectedItemParams {
	selectedItem: string | null;
	clusterName?: string | null;
	namespaceName?: string | null;
}

const selectedItemParamsParsers = {
	[INFRA_MONITORING_K8S_PARAMS_KEYS.SELECTED_ITEM]: parseAsString,
	[INFRA_MONITORING_K8S_PARAMS_KEYS.SELECTED_ITEM_CLUSTER_NAME]: parseAsString,
	[INFRA_MONITORING_K8S_PARAMS_KEYS.SELECTED_ITEM_NAMESPACE_NAME]: parseAsString,
};

export type UseSelectedItemParamsReturn = [
	SelectedItemParams,
	(params: SelectedItemParams | null) => void,
];

export const useInfraMonitoringSelectedItemParams =
	(): UseSelectedItemParamsReturn => {
		const [rawParams, setRawParams] = useQueryStates(
			selectedItemParamsParsers,
			defaultNuqsOptions,
		);

		const params: SelectedItemParams = useMemo(
			() => ({
				selectedItem:
					rawParams[INFRA_MONITORING_K8S_PARAMS_KEYS.SELECTED_ITEM] ?? null,
				clusterName:
					rawParams[INFRA_MONITORING_K8S_PARAMS_KEYS.SELECTED_ITEM_CLUSTER_NAME] ??
					null,
				namespaceName:
					rawParams[INFRA_MONITORING_K8S_PARAMS_KEYS.SELECTED_ITEM_NAMESPACE_NAME] ??
					null,
			}),
			[rawParams],
		);

		const setParams = useCallback(
			(newParams: Partial<SelectedItemParams> | null): void => {
				if (newParams === null) {
					void setRawParams({
						[INFRA_MONITORING_K8S_PARAMS_KEYS.SELECTED_ITEM]: null,
						[INFRA_MONITORING_K8S_PARAMS_KEYS.SELECTED_ITEM_CLUSTER_NAME]: null,
						[INFRA_MONITORING_K8S_PARAMS_KEYS.SELECTED_ITEM_NAMESPACE_NAME]: null,
					});
					return;
				}

				void setRawParams({
					[INFRA_MONITORING_K8S_PARAMS_KEYS.SELECTED_ITEM]:
						newParams.selectedItem ?? null,
					[INFRA_MONITORING_K8S_PARAMS_KEYS.SELECTED_ITEM_CLUSTER_NAME]:
						newParams.clusterName ?? null,
					[INFRA_MONITORING_K8S_PARAMS_KEYS.SELECTED_ITEM_NAMESPACE_NAME]:
						newParams.namespaceName ?? null,
				});
			},
			[setRawParams],
		);

		return [params, setParams];
	};

export const useInfraMonitoringStatusFilter = (): UseQueryStateReturn<
	string,
	string
> =>
	useQueryState(
		INFRA_MONITORING_K8S_PARAMS_KEYS.STATUS_FILTER,
		parseAsString.withDefault('').withOptions(defaultNuqsOptions),
	);
