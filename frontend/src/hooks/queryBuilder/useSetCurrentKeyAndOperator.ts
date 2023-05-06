import { getTagToken } from 'container/QueryBuilder/filters/QueryBuilderSearch/utils';
import { useMemo } from 'react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { getCountOfSpace } from 'utils/getCountOfSpace';

type ICurrentKeyAndOperator = [string, string, string[]];

export const useSetCurrentKeyAndOperator = (
	value: string,
	keys: BaseAutocompleteData[],
): ICurrentKeyAndOperator => {
	const [key, operator, result] = useMemo(() => {
		let key = '';
		let operator = '';
		let result: string[] = [];

		if (value) {
			const { tagKey, tagOperator, tagValue } = getTagToken(value);
			const isSuggestKey = keys?.some((el) => tagKey.includes(el.key));

			if (getCountOfSpace(value) >= 1 || isSuggestKey) {
				key = tagKey || '';
				operator = tagOperator || '';
				result = tagValue || [];
			}
		}

		return [key, operator, result];
	}, [value, keys]);

	return [key, operator, result];
};
