import { FORMULA_REGEXP } from 'constants/regExp';
import { Layout } from 'react-grid-layout';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { v4 } from 'uuid';

export const removeUndefinedValuesFromLayout = (layout: Layout[]): Layout[] =>
	layout.map((obj) =>
		Object.fromEntries(
			Object.entries(obj).filter(([, value]) => value !== undefined),
		),
	) as Layout[];

export const createFilterFromData = (
	data: Record<string, unknown>,
): TagFilterItem[] =>
	Object.entries(data ?? {}).map(([key, value]) => ({
		id: v4(),
		key: {
			key,
			dataType: DataTypes.String,
			type: '',
			isColumn: false,
			isJSON: false,
			id: `${key}--string----false`,
		},
		op: '=',
		value: value?.toString() ?? '',
	}));

export const isFormula = (queryName: string): boolean =>
	FORMULA_REGEXP.test(queryName);
