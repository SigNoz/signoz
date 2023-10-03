import {
	getRemovePrefixFromKey,
	getTagToken,
} from 'container/QueryBuilder/filters/QueryBuilderSearch/utils';
import { useRef } from 'react';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';

type ICurrentKeyAndOperator = [string, string, string[]];

export const useSetCurrentKeyAndOperator = (
	value: string,
	keys: BaseAutocompleteData[],
): ICurrentKeyAndOperator => {
	const keyRef = useRef<string>('');
	const operatorRef = useRef<string>('');
	let result: string[] = [];

	const { tagKey, tagOperator, tagValue } = getTagToken(value);

	const isSuggestKey = keys?.some(
		(el) => el?.key === getRemovePrefixFromKey(tagKey),
	);
	if (isSuggestKey || keys.length === 0) {
		keyRef.current = tagKey || '';
		operatorRef.current = tagOperator || '';
		result = tagValue || [];
	}

	return [keyRef.current, operatorRef.current, result];
};
