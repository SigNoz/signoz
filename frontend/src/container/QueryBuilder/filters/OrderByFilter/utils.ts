import { IOption } from 'hooks/useResourceAttribute/types';
import { transformStringWithPrefix } from 'lib/query/transformStringWithPrefix';
import * as Papa from 'papaparse';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';

export const orderByValueDelimiter = '|';

export function mapLabelValuePairs(
	arr: BaseAutocompleteData[],
): Array<IOption>[] {
	return arr.map((item) => {
		const label = transformStringWithPrefix({
			str: item.key,
			prefix: item.type || '',
			condition: !item.isColumn,
		});
		const value = item.key;
		return [
			{
				label: `${label} asc`,
				value: `${value}${orderByValueDelimiter}asc`,
			},
			{
				label: `${label} desc`,
				value: `${value}${orderByValueDelimiter}desc`,
			},
		];
	});
}

export function getLabelFromValue(arr: string[]): string[] {
	return arr.flat().map((item) => {
		const match = Papa.parse(item, { delimiter: orderByValueDelimiter });
		if (match) {
			const [key] = match.data as string[];
			return key[0];
		}
		return item;
	});
}

export function checkIfKeyPresent(str: string, valueToCheck: string): boolean {
	return new RegExp(`\\(${valueToCheck}\\)`).test(str);
}
