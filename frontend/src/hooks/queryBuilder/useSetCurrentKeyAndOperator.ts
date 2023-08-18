import {
	getRemovePrefixFromKey,
	getTagToken,
} from 'container/QueryBuilder/filters/QueryBuilderSearch/utils';
import { useMemo } from 'react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';

type ICurrentKeyAndOperator = [string, string, string[]];

export const useSetCurrentKeyAndOperator = (
	value: string,
	keys: BaseAutocompleteData[],
): ICurrentKeyAndOperator => {
	const [key, operator, result] = useMemo(() => {
		let key = '';
		let operator = '';
		let result: string[] = [];
		const { tagKey, tagOperator, tagValue } = getTagToken(value);
		const isSuggestKey = keys?.some(
			(el) => el?.key === getRemovePrefixFromKey(tagKey),
		);
		if (isSuggestKey || keys.length === 0) {
			key = tagKey || '';
			operator = tagOperator || '';
			result = tagValue || [];
		}

		return [key, operator, result];
	}, [value, keys]);

	return [key, operator, result];
};
