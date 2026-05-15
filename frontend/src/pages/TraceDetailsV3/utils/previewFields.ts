import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	FieldContext,
	FieldDataType,
	TelemetryFieldKey,
} from 'types/api/v5/queryRange';

/**
 * Map the picker's `BaseAutocompleteData.type` (`'tag' | 'resource' | '' | null`)
 * to the API's `FieldContext`. Unknown values fall back to `'attribute'`.
 */
function mapFieldContext(type: BaseAutocompleteData['type']): FieldContext {
	if (type === 'resource') {
		return 'resource';
	}
	return 'attribute';
}

const DATA_TYPE_MAP: Record<DataTypes, FieldDataType> = {
	[DataTypes.String]: 'string',
	[DataTypes.bool]: 'bool',
	[DataTypes.Int64]: 'int64',
	[DataTypes.Float64]: 'float64',
	[DataTypes.ArrayString]: '[]string',
	[DataTypes.ArrayBool]: '[]bool',
	[DataTypes.ArrayInt64]: '[]int64',
	[DataTypes.ArrayFloat64]: '[]float64',
	[DataTypes.EMPTY]: 'string',
};

function mapFieldDataType(
	dataType: BaseAutocompleteData['dataType'],
): FieldDataType {
	if (!dataType) {
		return 'string';
	}
	return DATA_TYPE_MAP[dataType] ?? 'string';
}

/**
 * Convert a picker-shaped field to the API's `TelemetryFieldKey` shape used
 * for `selectFields` on the flamegraph request.
 */
export function toTelemetryFieldKey(
	field: BaseAutocompleteData,
): TelemetryFieldKey {
	return {
		name: field.key,
		fieldContext: mapFieldContext(field.type),
		fieldDataType: mapFieldDataType(field.dataType),
	};
}

/**
 * Merge two `TelemetryFieldKey` lists, de-duping by `name`. Earlier entries win
 * (so callers can pass user-controlled fields after a baseline list and have
 * the baseline's metadata be preserved).
 */
export function mergeTelemetryFieldKeys(
	...lists: TelemetryFieldKey[][]
): TelemetryFieldKey[] {
	const seen = new Set<string>();
	const out: TelemetryFieldKey[] = [];
	for (const list of lists) {
		for (const f of list) {
			if (seen.has(f.name)) {
				continue;
			}
			seen.add(f.name);
			out.push(f);
		}
	}
	return out;
}
