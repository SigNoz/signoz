import {
	AttributeKeyOptions,
	getAttributesKeys,
	getAttributesValues,
} from 'api/queryBuilder/getAttributesKeysValues';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from 'react-query';
import { useDebounce } from 'react-use';
import { IBuilderQueryForm } from 'types/api/queryBuilder/queryBuilderData';
import { getCountOfSpace } from 'utils/getCountOfSpace';
import { separateSearchValue } from 'utils/separateSearchValue';

type UseFetchKeysAndValuesReturnValues = {
	keys: AttributeKeyOptions[];
	results: string[];
	isFetching: boolean;
};

export const useFetchKeysAndValues = (
	searchValue: string,
	query: IBuilderQueryForm,
): UseFetchKeysAndValuesReturnValues => {
	const [keys, setKeys] = useState<AttributeKeyOptions[]>([]);
	const [results, setResults] = useState<string[]>([]);

	const { data, isFetching, status } = useQuery(
		[
			'GET_ATTRIBUTE_KEY',
			searchValue,
			query.dataSource,
			query.aggregateOperator,
			query.aggregateAttribute.key,
		],
		async () =>
			getAttributesKeys({
				searchText: searchValue,
				dataSource: query.dataSource,
				aggregateOperator: query.aggregateOperator,
				aggregateAttribute: query.aggregateAttribute.key,
			}),
		{ enabled: !!query.aggregateOperator && !!query.dataSource },
	);

	useEffect(() => {
		if (status === 'success' && data?.payload) {
			setKeys(data?.payload);
		}
	}, [data?.payload, status]);

	const handleSetKey = (tagKeys: AttributeKeyOptions[] | null): void => {
		if (tagKeys) {
			setKeys(tagKeys);
		} else {
			setKeys([]);
		}
	};

	const handleFetchOption = async (
		value: string,
		query: IBuilderQueryForm,
	): Promise<void> => {
		if (value) {
			const [tKey, operator] = separateSearchValue(value);

			if (getCountOfSpace(value) === 0 && tKey) {
				const { payload } = await getAttributesKeys({
					searchText: value,
					dataSource: query.dataSource,
					aggregateOperator: query.aggregateOperator,
					aggregateAttribute: query.aggregateAttribute.key,
				});
				handleSetKey(payload);
			}

			if (tKey && operator) {
				const { payload } = await getAttributesValues({
					searchText: searchValue,
					dataSource: query.dataSource,
					aggregateOperator: query.aggregateOperator,
					aggregateAttribute: query.aggregateAttribute.key,
					attributeKey: tKey,
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

	const clearFetcher = useRef(handleFetchOption).current;

	useDebounce(() => clearFetcher(searchValue, query), 500, [
		clearFetcher,
		searchValue,
		query,
	]);

	return {
		keys,
		results,
		isFetching,
	};
};
