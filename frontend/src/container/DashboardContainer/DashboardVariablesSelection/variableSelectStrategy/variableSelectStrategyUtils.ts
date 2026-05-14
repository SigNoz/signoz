import { isEqual } from 'lodash-es';

export const areArraysEqualIgnoreOrder = (
	a: (string | number | boolean)[],
	b: (string | number | boolean)[],
): boolean => {
	if (a.length !== b.length) {
		return false;
	}
	const sortedA = [...a].sort();
	const sortedB = [...b].sort();
	return isEqual(sortedA, sortedB);
};

export const uniqueValues = (values: string[] | string): string[] | string => {
	if (Array.isArray(values)) {
		const uniqueValues: string[] = [];
		const seenValues = new Set<string>();

		values.forEach((value) => {
			if (seenValues.has(value)) {
				return;
			}
			seenValues.add(value);
			uniqueValues.push(value);
		});

		return uniqueValues;
	}

	return values;
};
