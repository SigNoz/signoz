import {
	TelemetrytypesFieldContextDTO,
	TelemetrytypesFieldDataTypeDTO,
} from 'api/generated/services/sigNoz.schemas';
import { SIGNAL_DATA_SOURCE_MAP } from 'components/QuickFilters/QuickFiltersSettings/constants';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';

import { FiltersType, IQuickFiltersConfig, SignalType } from './types';

const FILTER_TITLE_MAP: Record<string, string> = {
	duration_nano: 'Duration',
	hasError: 'Has Error (Status)',
};

const FILTER_TYPE_MAP: Record<string, FiltersType> = {
	duration_nano: FiltersType.DURATION,
};

// Both maps below (and mapFieldDataType/mapFieldContext) exist only for the old
// v3 attribute-values fetch in useCheckboxFilterValues, which is the sole reader
// of attributeKey.dataType/type. Query/list endpoints don't consume them (v5 and
// the API-monitoring/exceptions/infra paths all send a name-based expression).
// Once the values fetch moves to fields/values (by name) in Phase A, this whole
// mapping can be removed and attributeKey reduced to { id, key }.

// The new field data types are rendered down to the v3 spellings the
// attribute-values call expects, matching the backend's legacy conversion
// (number -> float64).
const FIELD_DATA_TYPE_TO_DATA_TYPE: Record<string, DataTypes> = {
	[TelemetrytypesFieldDataTypeDTO.string]: DataTypes.String,
	[TelemetrytypesFieldDataTypeDTO.bool]: DataTypes.bool,
	[TelemetrytypesFieldDataTypeDTO.float64]: DataTypes.Float64,
	[TelemetrytypesFieldDataTypeDTO.int64]: DataTypes.Int64,
	[TelemetrytypesFieldDataTypeDTO.number]: DataTypes.Float64,
};

// Only tag and resource exist in the v3 attribute-type enum; other contexts
// render as empty so the still-live v3 values path never sees a spelling it
// can't use, matching the backend's legacy conversion.
const FIELD_CONTEXT_TO_ATTRIBUTE_TYPE: Record<string, string> = {
	[TelemetrytypesFieldContextDTO.attribute]: 'tag',
	[TelemetrytypesFieldContextDTO.resource]: 'resource',
};

const mapFieldDataType = (fieldDataType?: string): DataTypes =>
	(fieldDataType && FIELD_DATA_TYPE_TO_DATA_TYPE[fieldDataType]) ||
	DataTypes.EMPTY;

const mapFieldContext = (fieldContext?: string): string =>
	(fieldContext && FIELD_CONTEXT_TO_ATTRIBUTE_TYPE[fieldContext]) || '';

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
				attributeKey: {
					id: att.name,
					key: att.name,
					dataType: mapFieldDataType(att.fieldDataType),
					type: mapFieldContext(att.fieldContext),
				},
				defaultOpen: index < 2,
			}) as IQuickFiltersConfig,
	);
};
