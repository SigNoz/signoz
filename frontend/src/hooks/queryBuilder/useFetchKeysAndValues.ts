import { getAggregateKeys } from 'api/queryBuilder/getAttributeKeys';
import { getAttributesValues } from 'api/queryBuilder/getAttributesValues';
import { QueryBuilderKeys } from 'constants/queryBuilder';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from 'react-query';
import { useDebounce } from 'react-use';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQueryForm } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { separateSearchValue } from 'utils/separateSearchValue';

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
	query: IBuilderQueryForm,
): IuseFetchKeysAndValues => {
	const [keys, setKeys] = useState<BaseAutocompleteData[]>([]);
	const [results, setResults] = useState<string[]>([]);

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
		[
			QueryBuilderKeys.GET_ATTRIBUTE_KEY,
			query.dataSource,
			query.aggregateOperator,
			query.aggregateAttribute.key,
		],
		async () =>
			getAggregateKeys({
				searchText: searchValue,
				dataSource: query.dataSource,
				aggregateOperator: query.aggregateOperator,
				aggregateAttribute: query.aggregateAttribute.key,
				tagType: query.aggregateAttribute.type ?? '',
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
	): Promise<void> => {
		if (!value) {
			return;
		}
		const [attributeKey, operator, result] = separateSearchValue(value);
		setResults([]);

		if (!attributeKey || !operator) {
			return;
		}

		const { payload } = await getAttributesValues({
			aggregateOperator: query.aggregateOperator,
			dataSource: query.dataSource,
			aggregateAttribute: query.aggregateAttribute.key,
			attributeKey,
			filterAttributeKeyDataType: query.aggregateAttribute.dataType,
			tagType: query.aggregateAttribute.type ?? null,
			searchText: !result[result.length - 1]?.endsWith(',') // for IN and Not IN string ends with ","
				? result[result.length - 1] ?? '' // so needs to add last search value if present
				: '',
		});

		if (payload) {
			const values = Object.values(payload).find((el) => !!el) || [];
			setResults(values);
		}
	};

	// creates a ref to the fetch function so that it doesn't change on every render
	const clearFetcher = useRef(handleFetchOption).current;

	// debounces the fetch function to avoid excessive API calls
	useDebounce(() => clearFetcher(searchValue, query), 750, [
		clearFetcher,
		searchValue,
		query,
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
