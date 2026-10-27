import { SIGNAL_DATA_SOURCE_MAP } from 'components/QuickFilters/QuickFiltersSettings/constants';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';
import { fieldContextToAttributeType } from 'utils/fieldContext';
import { fieldDataTypeToDataType } from 'utils/fieldDataType';

import { FiltersType, IQuickFiltersConfig, SignalType } from './types';

const FILTER_TITLE_MAP: Record<string, string> = {
	duration_nano: 'Duration',
	hasError: 'Has Error (Status)',
	has_error: 'Has Error (Status)',
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

const getFilterType = (att: TelemetryFieldKey): FiltersType => {
	if (FILTER_TYPE_MAP[att.name]) {
		return FILTER_TYPE_MAP[att.name];
	}
	return FiltersType.CHECKBOX;
};

export const getFilterConfig = (
	signal?: SignalType,
	customFilters?: TelemetryFieldKey[],
	config?: IQuickFiltersConfig[],
): IQuickFiltersConfig[] => {
	if (!customFilters?.length || !signal) {
		return config || [];
	}

	return customFilters.map(
		(att, index) =>
			({
				type: getFilterType(att),
				title: getFilterName(att.name),
				dataSource: SIGNAL_DATA_SOURCE_MAP[signal],
				// The type mapping below exists only for the old v3 attribute-values fetch
				// (useCheckboxFilterValues), the sole reader of attributeKey.dataType/type.
				// Once the values fetch moves to fields/values, remove this and reduce
				// attributeKey to { id, key }.
				attributeKey: {
					id: att.name,
					key: att.name,
					dataType: fieldDataTypeToDataType(att.fieldDataType),
					type: fieldContextToAttributeType(att.fieldContext),
				},
				defaultOpen: index < 2,
			}) as IQuickFiltersConfig,
	);
};
