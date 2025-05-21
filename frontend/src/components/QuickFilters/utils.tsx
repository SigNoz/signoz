import { SIGNAL_DATA_SOURCE_MAP } from 'components/QuickFilters/QuickFiltersSettings/constants';
import { Filter as FilterType } from 'types/api/quickFilters/getCustomFilters';

import { FiltersType, IQuickFiltersConfig, SignalType } from './types';

const getFilterName = (str: string): string =>
	// replace . and _ with space
	// capitalize the first letter of each word
	str
		.replace(/\./g, ' ')
		.replace(/_/g, ' ')
		.split(' ')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');

const getFilterType = (att: FilterType): FiltersType => {
	if (att.key === 'duration_nano') {
		return FiltersType.DURATION;
	}
	return FiltersType.CHECKBOX;
};

export const getFilterConfig = (
	signal?: SignalType,
	customFilters?: FilterType[],
	config?: IQuickFiltersConfig[],
): IQuickFiltersConfig[] => {
	if (!customFilters?.length || !signal) {
		return config || [];
	}

	return customFilters.map(
		(att, index) =>
			({
				type: getFilterType(att),
				title: getFilterName(att.key),
				dataSource: SIGNAL_DATA_SOURCE_MAP[signal],
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
