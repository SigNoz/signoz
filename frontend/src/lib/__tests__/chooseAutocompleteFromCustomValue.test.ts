import {
	baseAutoCompleteIdKeysOrder,
	initialAutocompleteData,
} from 'constants/queryBuilder';
import { MetricsType } from 'container/MetricsApplication/constant';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';

import { createIdFromObjectFields } from '../createIdFromObjectFields';
import { chooseAutocompleteFromCustomValue } from '../newQueryBuilder/chooseAutocompleteFromCustomValue';

describe('chooseAutocompleteFromCustomValue', () => {
	// Mock source list containing various data types and edge cases
	const mockSourceList = [
		{
			key: 'string_key',
			dataType: DataTypes.String,
			isJSON: false,
			isColumn: false,
			type: '',
			id: createIdFromObjectFields(
				{
					dataType: DataTypes.String,
					key: 'string_key',
					isColumn: false,
					type: '',
				},
				baseAutoCompleteIdKeysOrder,
			),
		},
		{
			key: 'number_key',
			dataType: DataTypes.Float64,
			isJSON: false,
			isColumn: false,
			type: '',
			id: createIdFromObjectFields(
				{
					dataType: DataTypes.Float64,
					key: 'number_key',
					isColumn: false,
					type: '',
				},
				baseAutoCompleteIdKeysOrder,
			),
		},
		{
			key: 'bool_key',
			dataType: DataTypes.bool,
			isJSON: false,
			isColumn: false,
			type: '',
			id: createIdFromObjectFields(
				{ dataType: DataTypes.bool, key: 'bool_key', isColumn: false, type: '' },
				baseAutoCompleteIdKeysOrder,
			),
		},
		{
			key: 'float_key',
			dataType: DataTypes.Float64,
			isJSON: false,
			isColumn: false,
			type: '',
			id: createIdFromObjectFields(
				{
					dataType: DataTypes.Float64,
					key: 'float_key',
					isColumn: false,
					type: '',
				},
				baseAutoCompleteIdKeysOrder,
			),
		},
		{
			key: 'unknown_key',
			dataType: DataTypes.EMPTY,
			isJSON: false,
			isColumn: false,
			type: '',
			id: createIdFromObjectFields(
				{
					dataType: DataTypes.EMPTY,
					key: 'unknown_key',
					isColumn: false,
					type: '',
				},
				baseAutoCompleteIdKeysOrder,
			),
		},
		{
			key: 'duplicate_key',
			dataType: DataTypes.String,
			isJSON: false,
			isColumn: false,
			type: '',
			id: createIdFromObjectFields(
				{
					dataType: DataTypes.String,
					key: 'duplicate_key',
					isColumn: false,
					type: '',
				},
				baseAutoCompleteIdKeysOrder,
			),
		},
		{
			key: 'duplicate_key',
			dataType: DataTypes.Float64,
			isJSON: false,
			isColumn: false,
			type: '',
			id: createIdFromObjectFields(
				{
					dataType: DataTypes.Float64,
					key: 'duplicate_key',
					isColumn: false,
					type: '',
				},
				baseAutoCompleteIdKeysOrder,
			),
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
				{
					key: 'json_key',
					dataType: DataTypes.String,
					isJSON: true,
					isColumn: false,
					type: '',
					id: createIdFromObjectFields(
						{
							dataType: DataTypes.String,
							key: 'json_key',
							isColumn: false,
							type: '',
							isJSON: true,
						},
						baseAutoCompleteIdKeysOrder,
					),
				},
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

	describe('when element with same value, same data type, and same fieldType found in sourceList', () => {
		const fieldTypeMockSourceList = [
			{
				key: 'tag_key',
				dataType: DataTypes.String,
				isJSON: false,
				type: MetricsType.Tag,
				isColumn: false,
				id: createIdFromObjectFields(
					{
						dataType: DataTypes.String,
						key: 'tag_key',
						isColumn: false,
						type: MetricsType.Tag,
					},
					baseAutoCompleteIdKeysOrder,
				),
			},
			{
				key: 'resource_key',
				dataType: DataTypes.Float64,
				isJSON: false,
				type: MetricsType.Resource,
				isColumn: false,
				id: createIdFromObjectFields(
					{
						dataType: DataTypes.Float64,
						key: 'resource_key',
						isColumn: false,
						type: MetricsType.Resource,
					},
					baseAutoCompleteIdKeysOrder,
				),
			},
			{
				key: 'scope_key',
				dataType: DataTypes.bool,
				isJSON: false,
				type: MetricsType.Scope,
				isColumn: false,
				id: createIdFromObjectFields(
					{
						dataType: DataTypes.bool,
						key: 'scope_key',
						isColumn: false,
						type: MetricsType.Scope,
					},
					baseAutoCompleteIdKeysOrder,
				),
			},
			{
				key: 'tag_key_duplicate',
				dataType: DataTypes.String,
				isJSON: false,
				type: MetricsType.Tag,
				isColumn: false,
				id: createIdFromObjectFields(
					{
						dataType: DataTypes.String,
						key: 'tag_key_duplicate',
						isColumn: false,
						type: MetricsType.Tag,
					},
					baseAutoCompleteIdKeysOrder,
				),
			},
			{
				key: 'tag_key_duplicate',
				dataType: DataTypes.String,
				isJSON: false,
				type: MetricsType.Resource,
				isColumn: false,
				id: createIdFromObjectFields(
					{
						dataType: DataTypes.String,
						key: 'tag_key_duplicate',
						isColumn: false,
						type: MetricsType.Resource,
					},
					baseAutoCompleteIdKeysOrder,
				),
			},
		] as BaseAutocompleteData[];

		it('should return matching element for Tag fieldType', () => {
			const result = chooseAutocompleteFromCustomValue(
				fieldTypeMockSourceList,
				'tag_key',
				false,
				'string' as DataTypes,
				MetricsType.Tag,
			);
			expect(result).toEqual(fieldTypeMockSourceList[0]);
		});

		it('should return matching element for Resource fieldType', () => {
			const result = chooseAutocompleteFromCustomValue(
				fieldTypeMockSourceList,
				'resource_key',
				false,
				'number' as DataTypes,
				MetricsType.Resource,
			);
			expect(result).toEqual(fieldTypeMockSourceList[1]);
		});

		it('should return matching element for Scope fieldType', () => {
			const result = chooseAutocompleteFromCustomValue(
				fieldTypeMockSourceList,
				'scope_key',
				false,
				'bool' as DataTypes,
				MetricsType.Scope,
			);
			expect(result).toEqual(fieldTypeMockSourceList[2]);
		});

		it('should return the correct duplicate with matching fieldType', () => {
			const result = chooseAutocompleteFromCustomValue(
				fieldTypeMockSourceList,
				'tag_key_duplicate',
				false,
				'string' as DataTypes,
				MetricsType.Resource,
			);
			expect(result).toEqual(fieldTypeMockSourceList[4]);
		});
	});

	describe('when element with same value and data type but different fieldType found in sourceList', () => {
		const fieldTypeMockSourceList = [
			{
				key: 'test_key',
				dataType: DataTypes.String,
				isJSON: false,
				type: MetricsType.Tag,
				isColumn: false,
				id: createIdFromObjectFields(
					{
						dataType: DataTypes.String,
						key: 'test_key',
						isColumn: false,
						type: MetricsType.Tag,
					},
					baseAutoCompleteIdKeysOrder,
				),
			},
		] as BaseAutocompleteData[];

		it('should return new object with updated fieldType when existing element has different fieldType', () => {
			const result = chooseAutocompleteFromCustomValue(
				fieldTypeMockSourceList,
				'test_key',
				false,
				'string' as DataTypes,
				MetricsType.Resource,
			);
			expect(result).toEqual({
				...initialAutocompleteData,
				key: 'test_key',
				dataType: DataTypes.String,
				isJSON: false,
				type: MetricsType.Resource,
			});
		});
	});

	describe('when element not found in sourceList but fieldType is provided', () => {
		it('should return new object with Tag fieldType', () => {
			const result = chooseAutocompleteFromCustomValue(
				mockSourceList,
				'new_key_with_tag_type',
				false,
				'string' as DataTypes,
				MetricsType.Tag,
			);
			expect(result).toEqual({
				...initialAutocompleteData,
				key: 'new_key_with_tag_type',
				dataType: DataTypes.String,
				isJSON: false,
				type: MetricsType.Tag,
			});
		});

		it('should return new object with Resource fieldType', () => {
			const result = chooseAutocompleteFromCustomValue(
				mockSourceList,
				'new_key_with_resource_type',
				false,
				'number' as DataTypes,
				MetricsType.Resource,
			);
			expect(result).toEqual({
				...initialAutocompleteData,
				key: 'new_key_with_resource_type',
				dataType: DataTypes.Float64,
				isJSON: false,
				type: MetricsType.Resource,
			});
		});

		it('should return new object with Scope fieldType', () => {
			const result = chooseAutocompleteFromCustomValue(
				mockSourceList,
				'new_key_with_scope_type',
				false,
				'bool' as DataTypes,
				MetricsType.Scope,
			);
			expect(result).toEqual({
				...initialAutocompleteData,
				key: 'new_key_with_scope_type',
				dataType: DataTypes.bool,
				isJSON: false,
				type: MetricsType.Scope,
			});
		});

		it('should return new object with empty fieldType when undefined is passed', () => {
			const result = chooseAutocompleteFromCustomValue(
				mockSourceList,
				'new_key_with_undefined_type',
				false,
				'string' as DataTypes,
				undefined,
			);
			expect(result).toEqual({
				...initialAutocompleteData,
				key: 'new_key_with_undefined_type',
				dataType: DataTypes.String,
				isJSON: false,
				type: '',
			});
		});

		it('should return new object with isJSON true and fieldType when not found', () => {
			const result = chooseAutocompleteFromCustomValue(
				mockSourceList,
				'json_not_found_with_type',
				true,
				'string' as DataTypes,
				MetricsType.Tag,
			);
			expect(result).toEqual({
				...initialAutocompleteData,
				key: 'json_not_found_with_type',
				dataType: DataTypes.String,
				isJSON: true,
				type: MetricsType.Tag,
			});
		});
	});
});
