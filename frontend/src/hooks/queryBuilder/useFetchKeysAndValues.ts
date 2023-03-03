import getKeysAutoComplete from 'api/queryBuilder/getKeysAutoComplete';
import getValuesAutoComplete from 'api/queryBuilder/getValuesAutoComplete';
import { useEffect, useRef, useState } from 'react';
import { separateSearchValue } from 'utils/separateSearchValue';

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

	// FETCH OPTIONS
	const handleFetchOption = async (value: string): Promise<void> => {
		if (value) {
			const [tKey, , tResult] = separateSearchValue(value);
			const isSuggestKey = keys.some((el) => el.key === tKey);

			if (getCountOfSpace(value) >= 2 && isSuggestKey) {
				const { payload } = await getValuesAutoComplete(tKey, tResult.join(' '));
				if (payload) {
					setResults(payload as []);
				} else {
					setResults([]);
				}
			}

			if (getCountOfSpace(value) === 0 && tKey) {
				const { payload } = await getKeysAutoComplete(value);
				if (payload) {
					setKeys(payload);
				} else {
					setKeys([]);
				}
			}
		}
	};

	const clearFetcher = useRef(handleFetchOption).current;
	useEffect(() => {
		const timer = setTimeout(() => clearFetcher(searchValue).then(), 300);
		return (): void => {
			clearTimeout(timer);
		};
	}, [clearFetcher, searchValue]);

	return {
		keys,
		results,
	};
};
