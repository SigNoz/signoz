import { getAttributesValues } from 'api/queryBuilder/getAttributesValues';
import { DEBOUNCE_DELAY } from 'constants/queryBuilderFilterConfig';
import {
	getRemovePrefixFromKey,
	getTagToken,
	isInNInOperator,
} from 'container/QueryBuilder/filters/QueryBuilderSearch/utils';
import useDebounceValue from 'hooks/useDebounce';
import { isEqual, uniqWith } from 'lodash-es';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDebounce } from 'react-use';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { useGetAggregateKeys } from './useGetAggregateKeys';

type IuseFetchKeysAndValues = {
	keys: BaseAutocompleteData[];
	results: string[];
	isFetching: boolean;
	sourceKeys: BaseAutocompleteData[];
	handleRemoveSourceKey: (newSourceKey: string) => void;
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
	const [sourceKeys, setSourceKeys] = useState<BaseAutocompleteData[]>([]);
	const [results, setResults] = useState<string[]>([]);

	const memoizedSearchParams = useMemo(
		() => [
			searchKey,
			query.dataSource,
			query.aggregateOperator,
			query.aggregateAttribute.key,
		],
		[
			searchKey,
			query.dataSource,
			query.aggregateOperator,
			query.aggregateAttribute.key,
		],
	);

	const searchParams = useDebounceValue(memoizedSearchParams, DEBOUNCE_DELAY);

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

	const { data, isFetching, status } = useGetAggregateKeys(
		{
			searchText: searchKey,
			dataSource: query.dataSource,
			aggregateOperator: query.aggregateOperator,
			aggregateAttribute: query.aggregateAttribute.key,
			tagType: query.aggregateAttribute.type ?? null,
		},
		{ queryKey: [searchParams], enabled: isQueryEnabled },
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

	return {
		keys,
		results,
		isFetching,
		sourceKeys,
		handleRemoveSourceKey,
	};
};
