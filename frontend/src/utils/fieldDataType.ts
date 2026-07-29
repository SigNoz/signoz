import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import type { FieldDataType } from 'types/api/v5/queryRange';

/**
 * The field metadata APIs and the query builder spell field types differently: the metadata
 * collapses the numerics to `number` and writes lists as `[]string`, while `DataTypes` — which
 * keys the operator and attribute-value lookups — uses `float64` and `array(string)`. Convert
 * where a reported type becomes a query-builder one, so those lookups can't miss.
 */
const TO_DATA_TYPE: Record<FieldDataType, DataTypes> = {
	'': DataTypes.EMPTY,
	string: DataTypes.String,
	bool: DataTypes.bool,
	int64: DataTypes.Int64,
	float64: DataTypes.Float64,
	number: DataTypes.Float64,
	'[]string': DataTypes.ArrayString,
	'[]bool': DataTypes.ArrayBool,
	'[]int64': DataTypes.ArrayInt64,
	'[]float64': DataTypes.ArrayFloat64,
	'[]number': DataTypes.ArrayFloat64,
};

/**
 * Exhaustive over `FieldDataType`, so a type added to the API union fails to compile here
 * rather than going missing at runtime. The fallback is for a spelling the union doesn't know
 * yet — the backend can store `[]json` and `[]dynamic` — not for any of the cases above.
 */
export const fieldDataTypeToDataType = (
	fieldDataType?: FieldDataType,
): DataTypes => TO_DATA_TYPE[fieldDataType ?? ''] ?? DataTypes.EMPTY;
