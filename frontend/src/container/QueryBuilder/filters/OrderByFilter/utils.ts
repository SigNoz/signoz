import { IOption } from 'hooks/useResourceAttribute/types';
import * as Papa from 'papaparse';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { OrderByPayload } from 'types/api/queryBuilder/queryBuilderData';

import { FILTERS } from './config';

export const orderByValueDelimiter = '|';

export const transformToOrderByStringValues = (
	orderBy: OrderByPayload[],
): IOption[] => {
	const prepareSelectedValue: IOption[] = orderBy.map((item) => ({
		label: `${item.columnName} ${item.order}`,
		value: `${item.columnName}${orderByValueDelimiter}${item.order}`,
	}));

	return prepareSelectedValue;
};

export function mapLabelValuePairs(
	arr: BaseAutocompleteData[],
): Array<IOption>[] {
	return arr.map((item) => {
		const value = item.key;
		return [
			{
				label: `${value} ${FILTERS.ASC}`,
				value: `${value}${orderByValueDelimiter}${FILTERS.ASC}`,
			},
			{
				label: `${value} ${FILTERS.DESC}`,
				value: `${value}${orderByValueDelimiter}${FILTERS.DESC}`,
			},
		];
	});
}

export function getLabelFromValue(arr: IOption[]): string[] {
	return arr.flat().map((item) => {
		const match = Papa.parse(item.value, { delimiter: orderByValueDelimiter });
		if (match) {
			const [key] = match.data as string[];

			return key[0];
		}

		return item.value;
	});
}

export function checkIfKeyPresent(str: string, valueToCheck: string): boolean {
	return new RegExp(`\\(${valueToCheck}\\)`).test(str);
}

export function splitOrderByFromString(str: string): OrderByPayload | null {
	const splittedStr = str.split(' ');
	const order = splittedStr.pop() || FILTERS.ASC;
	const columnName = splittedStr.join(' ');

	if (!columnName) return null;

	return { columnName, order };
}
