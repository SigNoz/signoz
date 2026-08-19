import {
	TelemetrytypesFieldContextDTO,
	TelemetrytypesFieldDataTypeDTO,
	TelemetrytypesGettableFieldKeysDTOKeys,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import { SignalType } from 'components/QuickFilters/types';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Filter as FilterType } from 'types/api/quickFilters/getCustomFilters';
import { DataSource } from 'types/common/queryBuilder';

import { SIGNAL_DATA_SOURCE_MAP } from './constants';

const DATA_SOURCE_TO_SIGNAL: Record<DataSource, TelemetrytypesSignalDTO> = {
	[DataSource.LOGS]: TelemetrytypesSignalDTO.logs,
	[DataSource.TRACES]: TelemetrytypesSignalDTO.traces,
	[DataSource.METRICS]: TelemetrytypesSignalDTO.metrics,
};

/** The saved type is sent as `tagType` to /v3/autocomplete/attribute_values, so v3 names win here. */
const FIELD_CONTEXT_TO_ATTRIBUTE_TYPE: Partial<
	Record<TelemetrytypesFieldContextDTO, string>
> = {
	[TelemetrytypesFieldContextDTO.attribute]: 'tag',
	[TelemetrytypesFieldContextDTO.resource]: 'resource',
};

/** `number` has no v3 counterpart and the backend rejects the whole save on it, hence float64. */
const FIELD_DATA_TYPE_TO_ATTRIBUTE_DATA_TYPE: Partial<
	Record<TelemetrytypesFieldDataTypeDTO, DataTypes>
> = {
	[TelemetrytypesFieldDataTypeDTO.string]: DataTypes.String,
	[TelemetrytypesFieldDataTypeDTO.bool]: DataTypes.bool,
	[TelemetrytypesFieldDataTypeDTO.int64]: DataTypes.Int64,
	[TelemetrytypesFieldDataTypeDTO.float64]: DataTypes.Float64,
	[TelemetrytypesFieldDataTypeDTO.number]: DataTypes.Float64,
};

export const getFieldKeysSignal = (
	signal: SignalType,
): TelemetrytypesSignalDTO | undefined => {
	const dataSource = SIGNAL_DATA_SOURCE_MAP[signal];
	return dataSource ? DATA_SOURCE_TO_SIGNAL[dataSource] : undefined;
};

/** Contexts with no v3 equivalent (span, log, body) fall back to '', the intrinsic-field lookup path. */
const toAttributeType = (
	fieldContext: TelemetrytypesFieldContextDTO | undefined,
): string =>
	(fieldContext && FIELD_CONTEXT_TO_ATTRIBUTE_TYPE[fieldContext]) || '';

/** Absent or unrecognised types fall back to '', which v3 reads as unspecified. */
const toAttributeDataType = (
	fieldDataType: TelemetrytypesFieldDataTypeDTO | undefined,
): DataTypes =>
	(fieldDataType && FIELD_DATA_TYPE_TO_ATTRIBUTE_DATA_TYPE[fieldDataType]) ||
	DataTypes.EMPTY;

/** Keys are grouped by name and one name can span contexts (resource and attribute); first wins. */
export const mapFieldKeysToFilters = (
	keys: TelemetrytypesGettableFieldKeysDTOKeys | undefined,
): FilterType[] => {
	if (!keys) {
		return [];
	}

	return Object.values(keys)
		.map(([fieldKey]) => fieldKey)
		.filter((fieldKey) => !!fieldKey?.name)
		.map((fieldKey) => ({
			key: fieldKey.name,
			dataType: toAttributeDataType(fieldKey.fieldDataType),
			type: toAttributeType(fieldKey.fieldContext),
		}));
};
