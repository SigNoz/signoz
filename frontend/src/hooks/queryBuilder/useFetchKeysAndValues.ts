import { getAggregateKeys } from 'api/queryBuilder/getAttributeKeys';
import { getAttributesValues } from 'api/queryBuilder/getAttributesValues';
import { QueryBuilderKeys } from 'constants/queryBuilder';
import {
	getRemovePrefixFromKey,
	getTagToken,
	isInNInOperator,
} from 'container/QueryBuilder/filters/QueryBuilderSearch/utils';
import debounce from 'lodash-es/debounce';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from 'react-query';
import { useDebounce } from 'react-use';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

type IuseFetchKeysAndValues = {
	keys: BaseAutocompleteData[];
	results: string[];
	isFetching: boolean;
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
	searchKey: string,
): IuseFetchKeysAndValues => {
	const [keys, setKeys] = useState<BaseAutocompleteData[]>([]);
	const [results, setResults] = useState<string[]>([]);

	const searchParams = useMemo(
		() =>
			debounce(
				() => [
					searchKey,
					query.dataSource,
					query.aggregateOperator,
					query.aggregateAttribute.key,
				],
				300,
			),
		[
			query.aggregateAttribute.key,
			query.aggregateOperator,
			query.dataSource,
			searchKey,
		],
	);

	const isQueryEnabled = useMemo(
		() =>
			query.dataSource === DataSource.METRICS
				? !!query.aggregateOperator &&
				  !!query.dataSource &&
				  !!query.aggregateAttribute.dataType
				: true,
		[
			query.aggregateAttribute.dataType,
			query.aggregateOperator,
			query.dataSource,
		],
	);

	const { data, isFetching, status } = useQuery(
		[QueryBuilderKeys.GET_ATTRIBUTE_KEY, searchParams()],
		async () =>
			getAggregateKeys({
				searchText: searchKey,
				dataSource: query.dataSource,
				aggregateOperator: query.aggregateOperator,
				aggregateAttribute: query.aggregateAttribute.key,
				tagType: query.aggregateAttribute.type ?? null,
			}),
		{
			enabled: isQueryEnabled,
		},
	);

	/**
	 * Fetches the options to be displayed based on the selected value
	 * @param value - the selected value
	 * @param query - an object containing data for the query
	 */
	const handleFetchOption = async (
		value: string,
		query: IBuilderQuery,
		keys: BaseAutocompleteData[],
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

		const { payload } = await getAttributesValues({
			aggregateOperator: query.aggregateOperator,
			dataSource: query.dataSource,
			aggregateAttribute: query.aggregateAttribute.key,
			attributeKey: filterAttributeKey?.key ?? tagKey,
			filterAttributeKeyDataType: filterAttributeKey?.dataType ?? null,
			tagType: filterAttributeKey?.type ?? null,
			searchText: isInNInOperator(tagOperator)
				? tagValue[tagValue.length - 1]?.toString() ?? '' // last element of tagvalue will be always user search value
				: tagValue?.toString() ?? '',
		});

		if (payload) {
			const values = Object.values(payload).find((el) => !!el) || [];
			setResults(values);
		}
	};

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
			setKeys(data?.payload.attributeKeys);
		} else {
			setKeys([]);
		}
	}, [data?.payload?.attributeKeys, status]);

	return {
		keys,
		results,
		isFetching,
	};
};
