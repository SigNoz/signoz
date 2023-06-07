import { getAggregateKeys } from 'api/queryBuilder/getAttributeKeys';
import { getAttributesValues } from 'api/queryBuilder/getAttributesValues';
import { QueryBuilderKeys } from 'constants/queryBuilder';
import {
	getRemovePrefixFromKey,
	getTagToken,
	isInNInOperator,
} from 'container/QueryBuilder/filters/QueryBuilderSearch/utils';
import useDebounce from 'hooks/useDebounce';
import { isEqual, uniqWith } from 'lodash-es';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from 'react-query';
import { useDebounce as reactDebounce } from 'react-use';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

type IuseFetchKeysAndValues = {
	keys: BaseAutocompleteData[];
	results: string[];
	isFetching: boolean;
	sourceKeys: BaseAutocompleteData[];
	handleRemoveSourceKey: (newSourceKey: string) => void;
};

export const useFetchKeysAndValues = (
	searchValue: string,
	query: IBuilderQuery,
	searchKey: string,
): IuseFetchKeysAndValues => {
	const [keys, setKeys] = useState<BaseAutocompleteData[]>([]);
	const [sourceKeys, setSourceKeys] = useState<BaseAutocompleteData[]>([]);
	const [results, setResults] = useState<string[]>([]);

	const debouncedSearchKey = useDebounce(searchKey, 300);
	const debouncedSearchValue = useDebounce(searchValue, 300);

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

	const { isFetching } = useQuery(
		[
			QueryBuilderKeys.GET_ATTRIBUTE_KEY,
			debouncedSearchKey,
			query.dataSource,
			query.aggregateOperator,
			query.aggregateAttribute.key,
		],
		async () =>
			getAggregateKeys({
				searchText: debouncedSearchKey,
				dataSource: query.dataSource,
				aggregateOperator: query.aggregateOperator,
				aggregateAttribute: query.aggregateAttribute.key,
				tagType: query.aggregateAttribute.type ?? null,
			}),
		{
			enabled: isQueryEnabled,
			onSuccess(data) {
				if (data.payload?.attributeKeys) {
					setKeys(data.payload.attributeKeys);
					setSourceKeys((prevState) =>
						uniqWith([...(data.payload.attributeKeys ?? []), ...prevState], isEqual),
					);
				} else {
					setKeys([]);
				}
			},
		},
	);

	const { mutateAsync } = useMutation(getAttributesValues, {
		onSuccess(data) {
			if (data.payload) {
				const values = Object.values(data.payload).find((el) => !!el) || [];
				setResults(values);
			}
		},
	});

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

		mutateAsync({
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
	};

	const handleRemoveSourceKey = useCallback((sourceKey: string) => {
		setSourceKeys((prevState) =>
			prevState.filter((item) => item.key !== sourceKey),
		);
	}, []);

	// creates a ref to the fetch function so that it doesn't change on every render
	const clearFetcher = useRef(handleFetchOption).current;

	// debounces the fetch function to avoid excessive API calls
	reactDebounce(() => clearFetcher(debouncedSearchValue, query, keys), 750, [
		clearFetcher,
		debouncedSearchValue,
		keys,
	]);

	return {
		keys,
		results,
		isFetching,
		sourceKeys,
		handleRemoveSourceKey,
	};
};
