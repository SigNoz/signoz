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

/**
 * Quick filters are persisted as v3 attribute keys, so the field context has to be translated back:
 * the saved type is sent as `tagType` when the checkbox filter looks up values on
 * /v3/autocomplete/attribute_values. Contexts with no v3 equivalent map to the unspecified type.
 */
const FIELD_CONTEXT_TO_ATTRIBUTE_TYPE: Partial<
	Record<TelemetrytypesFieldContextDTO, string>
> = {
	[TelemetrytypesFieldContextDTO.attribute]: 'tag',
	[TelemetrytypesFieldContextDTO.resource]: 'resource',
};

/**
 * `number` has no v3 counterpart and the backend rejects the whole save when it sees one,
 * so it is narrowed to float64.
 */
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

/**
 * The endpoint groups keys by name, and the same name can appear under more than one context
 * (e.g. both a resource and an attribute); the first entry wins.
 */
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
			dataType: fieldKey.fieldDataType
				? (FIELD_DATA_TYPE_TO_ATTRIBUTE_DATA_TYPE[fieldKey.fieldDataType] ??
					DataTypes.EMPTY)
				: DataTypes.EMPTY,
			type: fieldKey.fieldContext
				? (FIELD_CONTEXT_TO_ATTRIBUTE_TYPE[fieldKey.fieldContext] ?? '')
				: '',
		}));
};
