import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import type { FieldDataType } from 'types/api/v5/queryRange';

import { fieldDataTypeToDataType } from '../fieldDataType';

describe('fieldDataTypeToDataType', () => {
	it('maps the reported numeric spellings onto the query-builder numerics', () => {
		expect(fieldDataTypeToDataType('number')).toBe(DataTypes.Float64);
		expect(fieldDataTypeToDataType('int64')).toBe(DataTypes.Int64);
		expect(fieldDataTypeToDataType('float64')).toBe(DataTypes.Float64);
	});

	it('maps the list spellings onto the array types', () => {
		expect(fieldDataTypeToDataType('[]string')).toBe(DataTypes.ArrayString);
		expect(fieldDataTypeToDataType('[]bool')).toBe(DataTypes.ArrayBool);
		expect(fieldDataTypeToDataType('[]int64')).toBe(DataTypes.ArrayInt64);
		expect(fieldDataTypeToDataType('[]float64')).toBe(DataTypes.ArrayFloat64);
		expect(fieldDataTypeToDataType('[]number')).toBe(DataTypes.ArrayFloat64);
	});

	it('passes through the spellings the two vocabularies share', () => {
		expect(fieldDataTypeToDataType('string')).toBe(DataTypes.String);
		expect(fieldDataTypeToDataType('bool')).toBe(DataTypes.bool);
	});

	it('returns EMPTY for empty, missing and not-yet-known types', () => {
		expect(fieldDataTypeToDataType('')).toBe(DataTypes.EMPTY);
		expect(fieldDataTypeToDataType(undefined)).toBe(DataTypes.EMPTY);
		// The backend can store `[]json` / `[]dynamic`, which the API union doesn't list.
		expect(fieldDataTypeToDataType('[]json' as FieldDataType)).toBe(
			DataTypes.EMPTY,
		);
	});
});
