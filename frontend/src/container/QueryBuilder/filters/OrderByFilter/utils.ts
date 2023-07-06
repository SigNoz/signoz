import { IOption } from 'hooks/useResourceAttribute/types';
import { transformStringWithPrefix } from 'lib/query/transformStringWithPrefix';
import * as Papa from 'papaparse';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { OrderByPayload } from 'types/api/queryBuilder/queryBuilderData';

export const orderByValueDelimiter = '|';

export const transformToOrderByStringValues = (
	orderBy: OrderByPayload[],
): IOption[] => {
	const prepareSelectedValue: IOption[] = orderBy.reduce<IOption[]>(
		(acc, item) => {
			if (item.columnName === '#SIGNOZ_VALUE') return acc;

			const option: IOption = {
				label: `${item.columnName} ${item.order}`,
				value: `${item.columnName}${orderByValueDelimiter}${item.order}`,
			};

			acc.push(option);

			return acc;
		},
		[],
	);

	return prepareSelectedValue;
};

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
