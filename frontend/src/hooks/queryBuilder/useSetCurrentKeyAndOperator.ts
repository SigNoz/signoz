import { getTagToken } from 'container/QueryBuilder/filters/QueryBuilderSearch/utils';
import { useMemo, useRef } from 'react';

type ICurrentKeyAndOperator = [string, string, string[]];

export const useSetCurrentKeyAndOperator = (
	value: string,
): ICurrentKeyAndOperator => {
	const keyRef = useRef<string>('');
	const operatorRef = useRef<string>('');

	const result = useMemo(() => {
		let result: string[] = [];
		const { tagKey, tagOperator, tagValue } = getTagToken(value);

		keyRef.current = tagKey || '';
		operatorRef.current = tagOperator.toLowerCase() || '';
		result = tagValue || [];

		return result;
	}, [value]);

	return [keyRef.current, operatorRef.current, result];
};
