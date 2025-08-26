import { SIGNAL_DATA_SOURCE_MAP } from 'components/QuickFilters/QuickFiltersSettings/constants';
import { Filter as FilterType } from 'types/api/quickFilters/getCustomFilters';

import { FiltersType, IQuickFiltersConfig, SignalType } from './types';

const FILTER_TITLE_MAP: Record<string, string> = {
	duration_nano: 'Duration',
	hasError: 'Has Error (Status)',
};

const FILTER_TYPE_MAP: Record<string, FiltersType> = {
	duration_nano: FiltersType.DURATION,
};

const getFilterName = (str: string): string => {
	if (FILTER_TITLE_MAP[str]) {
		return FILTER_TITLE_MAP[str];
	}
	// replace . and _ with space
	// capitalize the first letter of each word
	return str
		.replace(/\./g, ' ')
		.replace(/_/g, ' ')
		.split(' ')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
};

const getFilterType = (att: FilterType): FiltersType => {
	if (FILTER_TYPE_MAP[att.key]) {
		return FILTER_TYPE_MAP[att.key];
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
				},
				defaultOpen: index < 2,
			} as IQuickFiltersConfig),
	);
};
