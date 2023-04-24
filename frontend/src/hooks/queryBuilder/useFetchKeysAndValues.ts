import { getAggregateKeys } from 'api/queryBuilder/getAttributeKeys';
import { getAttributesValues } from 'api/queryBuilder/getAttributesValues';
import { QueryBuilderKeys } from 'constants/queryBuilder';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from 'react-query';
import { useDebounce } from 'react-use';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQueryForm } from 'types/api/queryBuilder/queryBuilderData';
import { separateSearchValue } from 'utils/separateSearchValue';

type UseFetchKeysAndValuesReturnValues = {
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
): UseFetchKeysAndValuesReturnValues => {
	const [keys, setKeys] = useState<BaseAutocompleteData[]>([]);
	const [results, setResults] = useState<string[]>([]);
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
				tagType: query.aggregateAttribute.type,
			}),
		{
			enabled:
				!!query.aggregateOperator &&
				!!query.dataSource &&
				!!query.aggregateAttribute.dataType,
		},
	);

	/**
	 * Fetches the options to be displayed based on the selected value
	 * @param value - the selected value
	 * @param query - an object containing data for the query
	 */
	const handleFetchOption = async (
		value: string,
		query: IBuilderQueryForm,
	): Promise<void> => {
		if (value) {
			// separate the search value into the attribute key and the operator
			const [tKey, operator] = separateSearchValue(value);
			setResults([]);
			if (tKey && operator) {
				const { payload } = await getAttributesValues({
					aggregateOperator: query.aggregateOperator,
					dataSource: query.dataSource,
					aggregateAttribute: query.aggregateAttribute.key,
					attributeKey: tKey,
					attributeKeyDataType: query.aggregateAttribute.dataType,
					filterAttributeTagType: query.aggregateAttribute.type ?? null,
					searchText: value.split(' ')[2],
				});
				if (payload) {
					const values = Object.values(payload).find((el) => !!el);
					if (values) {
						setResults(values);
					} else {
						setResults([]);
					}
				}
			}
		}
	};

	// creates a ref to the fetch function so that it doesn't change on every render
	const clearFetcher = useRef(handleFetchOption).current;

	// debounces the fetch function to avoid excessive API calls
	useDebounce(() => clearFetcher(searchValue, query), 500, [
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
