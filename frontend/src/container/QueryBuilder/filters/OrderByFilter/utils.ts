import { IOption } from 'hooks/useResourceAttribute/types';
import { transformStringWithPrefix } from 'lib/query/transformStringWithPrefix';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';

import { OrderByFilterValue } from './OrderByFilter.interfaces';

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
				value: `${value} asc`,
			},
			{
				label: `${label} desc`,
				value: `${value} desc`,
			},
		];
	});
}

export function getLabelFromValue(arr: OrderByFilterValue[]): string[] {
	return arr.map((value) => value.label.split(' ')[0]);
}
