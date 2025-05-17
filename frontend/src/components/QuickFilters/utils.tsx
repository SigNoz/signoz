import { Filter as FilterType } from 'types/api/quickFilters/getCustomFilters';

import { FiltersType, IQuickFiltersConfig } from './types';

const getFilterName = (str: string): string =>
	// replace . and _ with space
	str.replace(/\./g, ' ').replace(/_/g, ' ');

export const getFilterConfig = (
	customFilters?: FilterType[],
	config?: IQuickFiltersConfig[],
): IQuickFiltersConfig[] => {
	if (!customFilters?.length) {
		return config || [];
	}

	return customFilters.map(
		(att, index) =>
			({
				type: FiltersType.CHECKBOX,
				title: getFilterName(att.key),
				attributeKey: {
					id: att.key,
					key: att.key,
					dataType: att.dataType,
					type: att.type,
					isColumn: att.isColumn,
					isJSON: att.isJSON,
				},
				defaultOpen: index === 0,
			} as IQuickFiltersConfig),
	);
};
