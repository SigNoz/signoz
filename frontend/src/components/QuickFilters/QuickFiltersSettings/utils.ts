import {
	TelemetrytypesFieldContextDTO,
	TelemetrytypesGettableFieldKeysDTOKeys,
	TelemetrytypesSignalDTO,
	TelemetrytypesTelemetryFieldKeyDTO,
} from 'api/generated/services/sigNoz.schemas';
import { Filter as FilterType } from 'types/api/quickFilters/getCustomFilters';
import { DataSource } from 'types/common/queryBuilder';
import { fieldDataTypeToDataType } from 'utils/fieldDataType';

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

const toAttributeType = (
	fieldContext: TelemetrytypesFieldContextDTO | undefined,
): string =>
	(fieldContext && FIELD_CONTEXT_TO_ATTRIBUTE_TYPE[fieldContext]) || '';

export const getFilterId = (filter: {
	key: string;
	type?: string | null;
}): string => (filter.type ? `${filter.type}:${filter.key}` : filter.key);

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
		dataType: fieldDataTypeToDataType(fieldKey.fieldDataType),
		type: toAttributeType(fieldKey.fieldContext),
	}));

/** Keeps the raw field context: for metrics `type` carries the aggregation, not the attribute scope. */
export const mapMeterFieldKeysToFilters = (
	keys: TelemetrytypesGettableFieldKeysDTOKeys | undefined,
): FilterType[] =>
	mapEachKeyVariant(keys, (fieldKey) => ({
		key: fieldKey.name,
		dataType: fieldDataTypeToDataType(fieldKey.fieldDataType),
		type: fieldKey.fieldContext || '',
	}));
