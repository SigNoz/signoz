import { useMemo } from 'react';
import { getCountOfSpace } from 'utils/getCountOfSpace';
import { separateSearchValue } from 'utils/separateSearchValue';

import { KeyType } from './useAutoComplete';

type ReturnT = [string, string, string[]];

export const useSetCurrentKeyAndOperator = (
	value: string,
	keys: KeyType[],
): ReturnT =>
	useMemo((): ReturnT => {
		let key = '';
		let operator = '';
		let result: string[] = [];
		if (value) {
			const [tKey, tOperator, tResult] = separateSearchValue(value);
			const isSuggestKey = keys.some((el) => el.key === tKey);

			if (getCountOfSpace(value) >= 1 || isSuggestKey) {
				key = tKey || '';
				operator = tOperator || '';
				result = tResult;
			}
		}

		return [key, operator, result];
	}, [keys, value]);
