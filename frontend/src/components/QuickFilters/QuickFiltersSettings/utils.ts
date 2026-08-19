import {
	TelemetrytypesFieldContextDTO,
	TelemetrytypesFieldDataTypeDTO,
	TelemetrytypesGettableFieldKeysDTOKeys,
	TelemetrytypesSignalDTO,
} from 'api/generated/services/sigNoz.schemas';
import { SignalType } from 'components/QuickFilters/types';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Filter as FilterType } from 'types/api/quickFilters/getCustomFilters';

const SIGNAL_TO_FIELD_KEYS_SIGNAL: Record<SignalType, TelemetrytypesSignalDTO> =
	{
		[SignalType.LOGS]: TelemetrytypesSignalDTO.logs,
		[SignalType.TRACES]: TelemetrytypesSignalDTO.traces,
		[SignalType.EXCEPTIONS]: TelemetrytypesSignalDTO.traces,
		[SignalType.API_MONITORING]: TelemetrytypesSignalDTO.traces,
		[SignalType.METER_EXPLORER]: TelemetrytypesSignalDTO.metrics,
	};

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
): TelemetrytypesSignalDTO => SIGNAL_TO_FIELD_KEYS_SIGNAL[signal];

const toAttributeType = (
	fieldContext: TelemetrytypesFieldContextDTO | undefined,
): string =>
	(fieldContext && FIELD_CONTEXT_TO_ATTRIBUTE_TYPE[fieldContext]) || '';

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
