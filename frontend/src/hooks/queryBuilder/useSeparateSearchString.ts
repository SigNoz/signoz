import { useMemo } from 'react';

export const useSeparateSearchString = (
	value: string,
	keys: string[],
	operators: string[],
): string[] | string =>
	useMemo((): string[] | string => {
		if (value) {
			const separatedString = value.split(' ');
			const tKey = separatedString[0];
			const tOperator = separatedString[1];
			const pickedKey = keys.find((k) => k === tKey);
			const pickedOperator = operators.find((o) => o === tOperator);
			return [pickedKey || '', pickedOperator || ''];
		}
		return ['', ''];
	}, [keys, operators, value]);
