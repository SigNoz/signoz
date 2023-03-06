import getKeysAutoComplete from 'api/queryBuilder/getKeysAutoComplete';
import getValuesAutoComplete from 'api/queryBuilder/getValuesAutoComplete';
import { useEffect, useRef, useState } from 'react';
import { separateSearchValue } from 'utils/separateSearchValue';

import { OPERATORS } from '../../constants/queryBuilder';
import { PayloadProps } from '../../types/api/queryBuilder/getKeysAutoComplete';
import { getCountOfSpace } from '../../utils/getCountOfSpace';
import { KeyType } from './useAutoComplete';

type ReturnT = {
	keys: KeyType[];
	results: string[];
};

export const useFetchKeysAndValues = (searchValue: string): ReturnT => {
	const [keys, setKeys] = useState<KeyType[]>([]);
	// FOUND VALUES
	const [results, setResults] = useState([]);

	useEffect(() => {
		getKeysAutoComplete().then(({ payload }) => {
			if (payload) {
				setKeys(payload);
			}
		});
	}, []);

	const handleSetKey = (payload: PayloadProps[] | null): void => {
		if (payload) {
			setKeys(payload as []);
		} else {
			setKeys([]);
		}
	};

	const getIsMulti = (operator: string): boolean =>
		operator === OPERATORS.IN || operator === OPERATORS.NIN;
	const getResultPayload = (isMulti: boolean, tResult: string[]): string =>
		isMulti ? '' : tResult.join(' ');

	// FETCH OPTIONS
	const handleFetchOption = async (value: string): Promise<void> => {
		if (value) {
			const [tKey, operator, tResult] = separateSearchValue(value);
			const isMulti = getIsMulti(operator);
			const resultPayload = getResultPayload(isMulti, tResult);

			if (getCountOfSpace(value) === 0 && tKey) {
				const { payload } = await getKeysAutoComplete(value);
				handleSetKey(payload);
			}

			if (tKey && operator) {
				const { payload } = await getValuesAutoComplete(tKey, resultPayload);
				if (payload) {
					const values = Object.values(payload).find((el) => !!el);
					if (values) {
						setResults(values as []);
					} else {
						setResults([]);
					}
				}
			}
		}
	};

	const clearFetcher = useRef(handleFetchOption).current;

	useEffect(() => {
		const timer = setTimeout(() => clearFetcher(searchValue).then(), 100);
		return (): void => {
			clearTimeout(timer);
		};
	}, [clearFetcher, searchValue]);

	return {
		keys,
		results,
	};
};
