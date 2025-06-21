import { initialAutocompleteData } from 'constants/queryBuilder';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';

import { chooseAutocompleteFromCustomValue } from '../newQueryBuilder/chooseAutocompleteFromCustomValue';

describe('chooseAutocompleteFromCustomValue', () => {
	// Mock source list containing various data types and edge cases
	const mockSourceList = [
		{
			key: 'string_key',
			dataType: DataTypes.String,
			isJSON: false,
		},
		{
			key: 'number_key',
			dataType: DataTypes.Float64,
			isJSON: false,
		},
		{
			key: 'bool_key',
			dataType: DataTypes.bool,
			isJSON: false,
		},
		{
			key: 'float_key',
			dataType: DataTypes.Float64,
			isJSON: false,
		},
		{
			key: 'unknown_key',
			dataType: DataTypes.EMPTY,
			isJSON: false,
		},
		{
			key: 'duplicate_key',
			dataType: DataTypes.String,
			isJSON: false,
		},
		{
			key: 'duplicate_key',
			dataType: DataTypes.Float64,
			isJSON: false,
		},
	] as BaseAutocompleteData[];

	describe('when element with same value and same data type found in sourceList', () => {
		// Test case: Perfect match - both key and dataType match an existing element
		it('should return matching string element', () => {
			const result = chooseAutocompleteFromCustomValue(
				mockSourceList,
				'string_key',
				false,
				'string' as DataTypes,
			);

			expect(result).toEqual(mockSourceList[0]);
		});

		// Test case: Perfect match for numeric data type
		it('should return matching number element', () => {
			const result = chooseAutocompleteFromCustomValue(
				mockSourceList,
				'number_key',
				false,
				'number',
			);

			expect(result).toEqual(mockSourceList[1]);
		});

		// Test case: Perfect match for boolean data type
		it('should return matching bool element', () => {
			const result = chooseAutocompleteFromCustomValue(
				mockSourceList,
				'bool_key',
				false,
				'bool' as DataTypes,
			);

			expect(result).toEqual(mockSourceList[2]);
		});

		// Test case: Perfect match for float data type (maps to Float64)
		it('should return matching float element', () => {
			const result = chooseAutocompleteFromCustomValue(
				mockSourceList,
				'float_key',
				false,
				'number',
			);

			expect(result).toEqual(mockSourceList[3]);
		});

		// Test case: Perfect match for unknown data type
		it('should return matching unknown element', () => {
			const result = chooseAutocompleteFromCustomValue(
				mockSourceList,
				'unknown_key',
				false,
				'unknown' as DataTypes,
			);

			expect(result).toEqual({
				...initialAutocompleteData,
				key: 'unknown_key',
				dataType: 'unknown',
				isJSON: false,
			});
		});

		// Test case: Perfect match with isJSON true in sourceList
		it('should return matching element with isJSON true', () => {
			const jsonSourceList = [
				{ key: 'json_key', dataType: DataTypes.String, isJSON: true },
			];
			const result = chooseAutocompleteFromCustomValue(
				jsonSourceList as BaseAutocompleteData[],
				'json_key',
				true,
				'string' as DataTypes,
			);
			expect(result).toEqual(jsonSourceList[0]);
		});
	});

	describe('when element with same value but different data type found in sourceList', () => {
		// Test case: Key exists but dataType doesn't match - should create new object
		it('should return new object for string value with number dataType', () => {
			const result = chooseAutocompleteFromCustomValue(
				mockSourceList,
				'string_key',
				false,
				'number',
			);

			expect(result).toEqual({
				...initialAutocompleteData,
				key: 'string_key',
				dataType: DataTypes.Float64,
				isJSON: false,
			});
		});

		// Test case: Key exists but dataType doesn't match - should create new object
		it('should return new object for number value with string dataType', () => {
			const result = chooseAutocompleteFromCustomValue(
				mockSourceList,
				'number_key',
				false,
				'string' as DataTypes,
			);

			expect(result).toEqual({
				...initialAutocompleteData,
				key: 'number_key',
				dataType: DataTypes.String,
				isJSON: false,
			});
		});

		// Test case: Key exists but dataType doesn't match - should create new object
		it('should return new object for bool value with string dataType', () => {
			const result = chooseAutocompleteFromCustomValue(
				mockSourceList,
				'bool_key',
				false,
				'string' as DataTypes,
			);

			expect(result).toEqual({
				...initialAutocompleteData,
				key: 'bool_key',
				dataType: DataTypes.String,
				isJSON: false,
			});
		});

		// Test case: Duplicate key with different dataType - should return the matching one
		it('should return new object for duplicate key with different dataType', () => {
			const result = chooseAutocompleteFromCustomValue(
				mockSourceList,
				'duplicate_key',
				false,
				'number' as DataTypes,
			);

			expect(result).toEqual(mockSourceList[6]);
		});
	});

	describe('when element not found in sourceList', () => {
		// Test case: New key with string dataType - should create new object
		it('should return new object for string dataType', () => {
			const result = chooseAutocompleteFromCustomValue(
				mockSourceList,
				'new_string_key',
				false,
				'string' as DataTypes,
			);

			expect(result).toEqual({
				...initialAutocompleteData,
				key: 'new_string_key',
				dataType: DataTypes.String,
				isJSON: false,
			});
		});

		// Test case: New key with number dataType - should create new object with Float64
		it('should return new object for number dataType', () => {
			const result = chooseAutocompleteFromCustomValue(
				mockSourceList,
				'new_number_key',
				false,
				'number' as DataTypes,
			);

			expect(result).toEqual({
				...initialAutocompleteData,
				key: 'new_number_key',
				dataType: DataTypes.Float64,
				isJSON: false,
			});
		});

		// Test case: New key with boolean dataType - should create new object
		it('should return new object for bool dataType', () => {
			const result = chooseAutocompleteFromCustomValue(
				mockSourceList,
				'new_bool_key',
				false,
				'bool' as DataTypes,
			);

			expect(result).toEqual({
				...initialAutocompleteData,
				key: 'new_bool_key',
				dataType: DataTypes.bool,
				isJSON: false,
			});
		});

		// Test case: New key with unknown dataType - should create new object with 'unknown' string
		it('should return new object for unknown dataType', () => {
			const result = chooseAutocompleteFromCustomValue(
				mockSourceList,
				'new_unknown_key',
				false,
				'unknown' as DataTypes,
			);

			expect(result).toEqual({
				...initialAutocompleteData,
				key: 'new_unknown_key',
				dataType: 'unknown',
				isJSON: false,
			});
		});

		// Test case: New key with undefined dataType - should create new object with EMPTY
		it('should return new object for undefined dataType', () => {
			const result = chooseAutocompleteFromCustomValue(
				mockSourceList,
				'new_undefined_key',
				false,
			);

			expect(result).toEqual({
				...initialAutocompleteData,
				key: 'new_undefined_key',
				dataType: DataTypes.EMPTY,
				isJSON: false,
			});
		});

		// Test case: New key with isJSON true - should create new object with isJSON true
		it('should return new object with isJSON true when not found', () => {
			const result = chooseAutocompleteFromCustomValue(
				mockSourceList,
				'json_not_found',
				true,
				'string' as DataTypes,
			);
			expect(result).toEqual({
				...initialAutocompleteData,
				key: 'json_not_found',
				dataType: DataTypes.String,
				isJSON: true,
			});
		});
	});
});
