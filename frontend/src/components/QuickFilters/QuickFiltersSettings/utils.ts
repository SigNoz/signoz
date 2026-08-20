import {
	TelemetrytypesFieldContextDTO,
	TelemetrytypesFieldDataTypeDTO,
	TelemetrytypesGettableFieldKeysDTOKeys,
	TelemetrytypesSignalDTO,
	TelemetrytypesTelemetryFieldKeyDTO,
} from 'api/generated/services/sigNoz.schemas';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Filter as FilterType } from 'types/api/quickFilters/getCustomFilters';
import { DataSource } from 'types/common/queryBuilder';

/** Same values either side, but the enums are nominal — TS rejects the cast, so bridge them. */
export const DATA_SOURCE_TO_SIGNAL: Record<
	DataSource,
	TelemetrytypesSignalDTO
> = {
	[DataSource.LOGS]: TelemetrytypesSignalDTO.logs,
	[DataSource.TRACES]: TelemetrytypesSignalDTO.traces,
	[DataSource.METRICS]: TelemetrytypesSignalDTO.metrics,
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

const toAttributeType = (
	fieldContext: TelemetrytypesFieldContextDTO | undefined,
): string =>
	(fieldContext && FIELD_CONTEXT_TO_ATTRIBUTE_TYPE[fieldContext]) || '';

const toAttributeDataType = (
	fieldDataType: TelemetrytypesFieldDataTypeDTO | undefined,
): DataTypes =>
	(fieldDataType && FIELD_DATA_TYPE_TO_ATTRIBUTE_DATA_TYPE[fieldDataType]) ||
	DataTypes.EMPTY;

/** One name can span contexts, so `type` disambiguates — mirrors the columns menu's `buildCompositeKey`. */
export const getFilterId = (filter: {
	key: string;
	type?: string | null;
}): string => (filter.type ? `${filter.type}.${filter.key}` : filter.key);

/** Keyed by id: distinct contexts can map to the same v3 type, and a repeated id collides as a React key. */
const mapEachKeyVariant = (
	keys: TelemetrytypesGettableFieldKeysDTOKeys | undefined,
	toFilter: (fieldKey: TelemetrytypesTelemetryFieldKeyDTO) => FilterType,
): FilterType[] => {
	const filters = Object.values(keys ?? {})
		.flat()
		.filter((fieldKey) => !!fieldKey?.name)
		.map(toFilter);

	return [...new Map(filters.map((f) => [getFilterId(f), f])).values()];
};

/** Keys are grouped by name; each context under a name becomes its own filter. */
export const mapFieldKeysToFilters = (
	keys: TelemetrytypesGettableFieldKeysDTOKeys | undefined,
): FilterType[] =>
	mapEachKeyVariant(keys, (fieldKey) => ({
		key: fieldKey.name,
		dataType: toAttributeDataType(fieldKey.fieldDataType),
		type: toAttributeType(fieldKey.fieldContext),
	}));

/** Keeps the raw field context: for metrics `type` carries the aggregation, not the attribute scope. */
export const mapMeterFieldKeysToFilters = (
	keys: TelemetrytypesGettableFieldKeysDTOKeys | undefined,
): FilterType[] =>
	mapEachKeyVariant(keys, (fieldKey) => ({
		key: fieldKey.name,
		dataType: toAttributeDataType(fieldKey.fieldDataType),
		type: fieldKey.fieldContext || '',
	}));
