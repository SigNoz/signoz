/* eslint-disable sonarjs/cognitive-complexity */
import { getMetricsListFilterValues } from 'api/metricsExplorer/getMetricsListFilterValues';
import { getAttributesValues } from 'api/queryBuilder/getAttributesValues';
import { DATA_TYPE_VS_ATTRIBUTE_VALUES_KEY } from 'constants/queryBuilder';
import { DEBOUNCE_DELAY } from 'constants/queryBuilderFilterConfig';
import {
	GetK8sEntityToAggregateAttribute,
	K8sCategory,
} from 'container/InfraMonitoringK8s/constants';
import {
	getRemovePrefixFromKey,
	getTagToken,
	isInNInOperator,
} from 'container/QueryBuilder/filters/QueryBuilderSearch/utils';
import { useGetMetricsListFilterKeys } from 'hooks/metricsExplorer/useGetMetricsListFilterKeys';
import useDebounceValue from 'hooks/useDebounce';
import { cloneDeep, isEqual, uniqWith, unset } from 'lodash-es';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDebounce } from 'react-use';
import { IAttributeValuesResponse } from 'types/api/queryBuilder/getAttributesValues';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	IBuilderQuery,
	TagFilter,
} from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { useGetAggregateKeys } from './useGetAggregateKeys';
import { useGetAttributeSuggestions } from './useGetAttributeSuggestions';

type IuseFetchKeysAndValues = {
	keys: BaseAutocompleteData[];
	results: string[];
	isFetching: boolean;
	sourceKeys: BaseAutocompleteData[];
	handleRemoveSourceKey: (newSourceKey: string) => void;
	exampleQueries: TagFilter[];
};

/**
 * Custom hook to fetch attribute keys and values from an API
 * @param searchValue - the search query value
 * @param query - an object containing data for the query
 * @returns an object containing the fetched attribute keys, results, and the status of the fetch
 */

export const useFetchKeysAndValues = (
	searchValue: string,
	query: IBuilderQuery,
	dotMetricsEnabled: boolean,
	searchKey: string,
	shouldUseSuggestions?: boolean,
	isInfraMonitoring?: boolean,
	entity?: K8sCategory | null,
	isMetricsExplorer?: boolean,
): IuseFetchKeysAndValues => {
	const [keys, setKeys] = useState<BaseAutocompleteData[]>([]);
	const [exampleQueries, setExampleQueries] = useState<TagFilter[]>([]);
	const [sourceKeys, setSourceKeys] = useState<BaseAutocompleteData[]>([]);
	const [results, setResults] = useState<string[]>([]);
	const [isAggregateFetching, setAggregateFetching] = useState<boolean>(false);

	const memoizedSearchParams = useMemo(
		() => [
			searchKey,
			query.dataSource,
			query.aggregateOperator,
			query.aggregateAttribute?.key,
		],
		[
			searchKey,
			query.dataSource,
			query.aggregateOperator,
			query.aggregateAttribute?.key,
		],
	);

	const searchParams = useDebounceValue(memoizedSearchParams, DEBOUNCE_DELAY);

	const queryFiltersWithoutId = useMemo(
		() => ({
			...query.filters,
			items: query.filters?.items?.map((item) => {
				const filterWithoutId = cloneDeep(item);
				unset(filterWithoutId, 'id');
				return filterWithoutId;
			}),
		}),
		[query.filters],
	);

	const memoizedSuggestionsParams = useMemo(
		() => [searchKey, query.dataSource, queryFiltersWithoutId],
		[query.dataSource, queryFiltersWithoutId, searchKey],
	);

	const suggestionsParams = useDebounceValue(
		memoizedSuggestionsParams,
		DEBOUNCE_DELAY,
	);

	const isQueryEnabled = useMemo(
		() =>
			query.dataSource === DataSource.METRICS &&
			!isInfraMonitoring &&
			!isMetricsExplorer
				? !!query.dataSource && !!query.aggregateAttribute?.dataType
				: true,
		[
			isInfraMonitoring,
			isMetricsExplorer,
			query.aggregateAttribute?.dataType,
			query.dataSource,
		],
	);

	const { data, isFetching, status } = useGetAggregateKeys(
		{
			searchText: searchKey,
			dataSource: query.dataSource,
			aggregateOperator: query.aggregateOperator || '',
			aggregateAttribute:
				isInfraMonitoring && entity
					? GetK8sEntityToAggregateAttribute(entity, dotMetricsEnabled)
					: query.aggregateAttribute?.key || '',
			tagType: query.aggregateAttribute?.type ?? null,
		},
		{
			queryKey: [searchParams],
			enabled: isMetricsExplorer ? false : isQueryEnabled && !shouldUseSuggestions,
		},
		isInfraMonitoring, // isInfraMonitoring
		entity, // infraMonitoringEntity
	);

	const {
		data: suggestionsData,
		isFetching: isFetchingSuggestions,
		status: fetchingSuggestionsStatus,
	} = useGetAttributeSuggestions(
		{
			searchText: searchKey,
			dataSource: query.dataSource,
			filters: query.filters || { items: [], op: 'AND' },
		},
		{
			queryKey: [suggestionsParams],
			enabled: isQueryEnabled && shouldUseSuggestions,
		},
	);

	const {
		data: metricsListFilterKeysData,
		isFetching: isFetchingMetricsListFilterKeys,
		status: fetchingMetricsListFilterKeysStatus,
	} = useGetMetricsListFilterKeys(
		{
			searchText: searchKey,
		},
		{
			enabled: isMetricsExplorer && isQueryEnabled && !shouldUseSuggestions,
			queryKey: [searchKey],
		},
	);

	function isAttributeValuesResponse(
		payload: any,
	): payload is IAttributeValuesResponse {
		return (
			payload &&
			(Array.isArray(payload.stringAttributeValues) ||
				payload.stringAttributeValues === null ||
				Array.isArray(payload.numberAttributeValues) ||
				payload.numberAttributeValues === null ||
				Array.isArray(payload.boolAttributeValues) ||
				payload.boolAttributeValues === null)
		);
	}

	function isMetricsListFilterValuesData(
		payload: any,
	): payload is { filterValues: string[] } {
		return (
			payload && 'filterValues' in payload && Array.isArray(payload.filterValues)
		);
	}

	/**
	 * Fetches the options to be displayed based on the selected value
	 * @param value - the selected value
	 * @param query - an object containing data for the query
	 */
	const handleFetchOption = async (
		value: string,
		query: IBuilderQuery,
		keys: BaseAutocompleteData[],
		// eslint-disable-next-line sonarjs/cognitive-complexity
	): Promise<void> => {
		if (!value) {
			return;
		}
		const { tagKey, tagOperator, tagValue } = getTagToken(value);
		const filterAttributeKey = keys.find(
			(item) => item.key === getRemovePrefixFromKey(tagKey),
		);
		setResults([]);

		if (!tagKey || !tagOperator) {
			return;
		}
		setAggregateFetching(true);

		try {
			let payload;
			if (isInfraMonitoring && entity) {
				const response = await getAttributesValues({
					aggregateOperator: 'noop',
					dataSource: query.dataSource,
					aggregateAttribute:
						GetK8sEntityToAggregateAttribute(entity, dotMetricsEnabled) ||
						query.aggregateAttribute?.key ||
						'',
					attributeKey: filterAttributeKey?.key ?? tagKey,
					filterAttributeKeyDataType:
						filterAttributeKey?.dataType ?? DataTypes.EMPTY,
					tagType: filterAttributeKey?.type ?? '',
					searchText: isInNInOperator(tagOperator)
						? tagValue[tagValue.length - 1]?.toString() ?? ''
						: tagValue?.toString() ?? '',
				});
				payload = response.payload;
			} else if (isMetricsExplorer) {
				const response = await getMetricsListFilterValues({
					searchText: searchKey,
					filterKey: filterAttributeKey?.key ?? tagKey,
					filterAttributeKeyDataType:
						filterAttributeKey?.dataType ?? DataTypes.EMPTY,
					limit: 10,
				});
				payload = response.payload?.data;
			} else {
				const response = await getAttributesValues({
					aggregateOperator: query.aggregateOperator || '',
					dataSource: query.dataSource,
					aggregateAttribute: query.aggregateAttribute?.key || '',
					attributeKey: filterAttributeKey?.key ?? tagKey,
					filterAttributeKeyDataType:
						filterAttributeKey?.dataType ?? DataTypes.EMPTY,
					tagType: filterAttributeKey?.type ?? '',
					searchText: isInNInOperator(tagOperator)
						? tagValue[tagValue.length - 1]?.toString() ?? ''
						: tagValue?.toString() ?? '',
				});
				payload = response.payload;
			}

			if (payload) {
				if (isAttributeValuesResponse(payload)) {
					const dataType = filterAttributeKey?.dataType ?? DataTypes.String;
					const key = DATA_TYPE_VS_ATTRIBUTE_VALUES_KEY[dataType];
					setResults(key ? payload[key] || [] : []);
					return;
				}

				if (isMetricsExplorer && isMetricsListFilterValuesData(payload)) {
					setResults(payload.filterValues || []);
					return;
				}
			}
		} catch (e) {
			console.error(e);
		} finally {
			setAggregateFetching(false);
		}
	};

	const handleRemoveSourceKey = useCallback((sourceKey: string) => {
		setSourceKeys((prevState) =>
			prevState.filter((item) => item.key !== sourceKey),
		);
	}, []);

	// creates a ref to the fetch function so that it doesn't change on every render
	const clearFetcher = useRef(handleFetchOption).current;

	// debounces the fetch function to avoid excessive API calls
	useDebounce(() => clearFetcher(searchValue, query, keys), 750, [
		clearFetcher,
		searchValue,
		query,
		keys,
	]);

	// update the fetched keys when the fetch status changes
	useEffect(() => {
		if (status === 'success' && data?.payload?.attributeKeys) {
			setKeys(data.payload.attributeKeys);
			setSourceKeys((prevState) =>
				uniqWith([...(data.payload.attributeKeys ?? []), ...prevState], isEqual),
			);
		} else {
			setKeys([]);
		}
	}, [data?.payload?.attributeKeys, status]);

	useEffect(() => {
		if (
			isMetricsExplorer &&
			fetchingMetricsListFilterKeysStatus === 'success' &&
			!isFetchingMetricsListFilterKeys &&
			metricsListFilterKeysData?.payload?.data?.attributeKeys
		) {
			setKeys(metricsListFilterKeysData.payload.data.attributeKeys);
			setSourceKeys((prevState) =>
				uniqWith(
					[
						...(metricsListFilterKeysData.payload.data.attributeKeys ?? []),
						...prevState,
					],
					isEqual,
				),
			);
		}
	}, [
		metricsListFilterKeysData?.payload?.data?.attributeKeys,
		fetchingMetricsListFilterKeysStatus,
		isMetricsExplorer,
		metricsListFilterKeysData,
		isFetchingMetricsListFilterKeys,
	]);

	useEffect(() => {
		if (
			fetchingSuggestionsStatus === 'success' &&
			suggestionsData?.payload?.attributes
		) {
			if (!isInfraMonitoring) {
				setKeys(suggestionsData.payload.attributes);
				setSourceKeys((prevState) =>
					uniqWith(
						[...(suggestionsData.payload.attributes ?? []), ...prevState],
						isEqual,
					),
				);
			}
		} else {
			setKeys([]);
		}
		if (
			fetchingSuggestionsStatus === 'success' &&
			suggestionsData?.payload?.example_queries
		) {
			setExampleQueries(suggestionsData.payload.example_queries);
		} else {
			setExampleQueries([]);
		}
	}, [
		suggestionsData?.payload?.attributes,
		fetchingSuggestionsStatus,
		suggestionsData?.payload?.example_queries,
		isInfraMonitoring,
	]);

	return {
		keys,
		results,
		isFetching: isFetching || isAggregateFetching || isFetchingSuggestions,
		sourceKeys,
		handleRemoveSourceKey,
		exampleQueries,
	};
};
