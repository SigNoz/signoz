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
			type: '',
			id: createIdFromObjectFields(
				{
					dataType: DataTypes.String,
					key: 'string_key',
					type: '',
				},
				baseAutoCompleteIdKeysOrder,
			),
		},
		{
			key: 'number_key',
			dataType: DataTypes.Float64,
			type: '',
			id: createIdFromObjectFields(
				{
					dataType: DataTypes.Float64,
					key: 'number_key',
					type: '',
				},
				baseAutoCompleteIdKeysOrder,
			),
		},
		{
			key: 'bool_key',
			dataType: DataTypes.bool,
			type: '',
			id: createIdFromObjectFields(
				{ dataType: DataTypes.bool, key: 'bool_key', type: '' },
				baseAutoCompleteIdKeysOrder,
			),
		},
		{
			key: 'float_key',
			dataType: DataTypes.Float64,
			type: '',
			id: createIdFromObjectFields(
				{
					dataType: DataTypes.Float64,
					key: 'float_key',
					type: '',
				},
				baseAutoCompleteIdKeysOrder,
			),
		},
		{
			key: 'unknown_key',
			dataType: DataTypes.EMPTY,
			type: '',
			id: createIdFromObjectFields(
				{
					dataType: DataTypes.EMPTY,
					key: 'unknown_key',
					type: '',
				},
				baseAutoCompleteIdKeysOrder,
			),
		},
		{
			key: 'duplicate_key',
			dataType: DataTypes.String,
			type: '',
			id: createIdFromObjectFields(
				{
					dataType: DataTypes.String,
					key: 'duplicate_key',
					type: '',
				},
				baseAutoCompleteIdKeysOrder,
			),
		},
		{
			key: 'duplicate_key',
			dataType: DataTypes.Float64,
			type: '',
			id: createIdFromObjectFields(
				{
					dataType: DataTypes.Float64,
					key: 'duplicate_key',
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
				'string' as DataTypes,
			);

			expect(result).toEqual(mockSourceList[0]);
		});

		// Test case: Perfect match for numeric data type
		it('should return matching number element', () => {
			const result = chooseAutocompleteFromCustomValue(
				mockSourceList,
				'number_key',
				'number',
			);

			expect(result).toEqual(mockSourceList[1]);
		});

		// Test case: Perfect match for boolean data type
		it('should return matching bool element', () => {
			const result = chooseAutocompleteFromCustomValue(
				mockSourceList,
				'bool_key',
				'bool' as DataTypes,
			);

			expect(result).toEqual(mockSourceList[2]);
		});

		// Test case: Perfect match for float data type (maps to Float64)
		it('should return matching float element', () => {
			const result = chooseAutocompleteFromCustomValue(
				mockSourceList,
				'float_key',
				'number',
			);

			expect(result).toEqual(mockSourceList[3]);
		});

		// Test case: Perfect match for unknown data type
		it('should return matching unknown element', () => {
			const result = chooseAutocompleteFromCustomValue(
				mockSourceList,
				'unknown_key',
				'unknown' as DataTypes,
			);

			expect(result).toEqual({
				...initialAutocompleteData,
				key: 'unknown_key',
				dataType: 'unknown',
			});
		});

		// Test case: Perfect match with isJSON true in sourceList
		it('should return matching element with isJSON true', () => {
			const jsonSourceList = [
				{
					key: 'json_key',
					dataType: DataTypes.String,
					type: '',
					id: createIdFromObjectFields(
						{
							dataType: DataTypes.String,
							key: 'json_key',
							type: '',
						},
						baseAutoCompleteIdKeysOrder,
					),
				},
			];
			const result = chooseAutocompleteFromCustomValue(
				jsonSourceList as BaseAutocompleteData[],
				'json_key',
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
				'number',
			);

			expect(result).toEqual({
				...initialAutocompleteData,
				key: 'string_key',
				dataType: DataTypes.Float64,
			});
		});

		// Test case: Key exists but dataType doesn't match - should create new object
		it('should return new object for number value with string dataType', () => {
			const result = chooseAutocompleteFromCustomValue(
				mockSourceList,
				'number_key',
				'string' as DataTypes,
			);

			expect(result).toEqual({
				...initialAutocompleteData,
				key: 'number_key',
				dataType: DataTypes.String,
			});
		});

		// Test case: Key exists but dataType doesn't match - should create new object
		it('should return new object for bool value with string dataType', () => {
			const result = chooseAutocompleteFromCustomValue(
				mockSourceList,
				'bool_key',
				'string' as DataTypes,
			);

			expect(result).toEqual({
				...initialAutocompleteData,
				key: 'bool_key',
				dataType: DataTypes.String,
			});
		});

		// Test case: Duplicate key with different dataType - should return the matching one
		it('should return new object for duplicate key with different dataType', () => {
			const result = chooseAutocompleteFromCustomValue(
				mockSourceList,
				'duplicate_key',
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
				'string' as DataTypes,
			);

			expect(result).toEqual({
				...initialAutocompleteData,
				key: 'new_string_key',
				dataType: DataTypes.String,
			});
		});

		// Test case: New key with number dataType - should create new object with Float64
		it('should return new object for number dataType', () => {
			const result = chooseAutocompleteFromCustomValue(
				mockSourceList,
				'new_number_key',
				'number' as DataTypes,
			);

			expect(result).toEqual({
				...initialAutocompleteData,
				key: 'new_number_key',
				dataType: DataTypes.Float64,
			});
		});

		// Test case: New key with boolean dataType - should create new object
		it('should return new object for bool dataType', () => {
			const result = chooseAutocompleteFromCustomValue(
				mockSourceList,
				'new_bool_key',
				'bool' as DataTypes,
			);

			expect(result).toEqual({
				...initialAutocompleteData,
				key: 'new_bool_key',
				dataType: DataTypes.bool,
			});
		});

		// Test case: New key with unknown dataType - should create new object with 'unknown' string
		it('should return new object for unknown dataType', () => {
			const result = chooseAutocompleteFromCustomValue(
				mockSourceList,
				'new_unknown_key',
				'unknown' as DataTypes,
			);

			expect(result).toEqual({
				...initialAutocompleteData,
				key: 'new_unknown_key',
				dataType: 'unknown',
			});
		});

		// Test case: New key with undefined dataType - should create new object with EMPTY
		it('should return new object for undefined dataType', () => {
			const result = chooseAutocompleteFromCustomValue(
				mockSourceList,
				'new_undefined_key',
			);

			expect(result).toEqual({
				...initialAutocompleteData,
				key: 'new_undefined_key',
				dataType: DataTypes.EMPTY,
			});
		});

		// Test case: New key with isJSON true - should create new object with isJSON true
		it('should return new object with isJSON true when not found', () => {
			const result = chooseAutocompleteFromCustomValue(
				mockSourceList,
				'json_not_found',
				'string' as DataTypes,
			);
			expect(result).toEqual({
				...initialAutocompleteData,
				key: 'json_not_found',
				dataType: DataTypes.String,
			});
		});
	});

	describe('when element with same value, same data type, and same fieldType found in sourceList', () => {
		const fieldTypeMockSourceList = [
			{
				key: 'tag_key',
				dataType: DataTypes.String,
				type: MetricsType.Tag,
				id: createIdFromObjectFields(
					{
						dataType: DataTypes.String,
						key: 'tag_key',
						type: MetricsType.Tag,
					},
					baseAutoCompleteIdKeysOrder,
				),
			},
			{
				key: 'resource_key',
				dataType: DataTypes.Float64,
				type: MetricsType.Resource,
				id: createIdFromObjectFields(
					{
						dataType: DataTypes.Float64,
						key: 'resource_key',
						type: MetricsType.Resource,
					},
					baseAutoCompleteIdKeysOrder,
				),
			},
			{
				key: 'scope_key',
				dataType: DataTypes.bool,
				type: MetricsType.Scope,
				id: createIdFromObjectFields(
					{
						dataType: DataTypes.bool,
						key: 'scope_key',
						type: MetricsType.Scope,
					},
					baseAutoCompleteIdKeysOrder,
				),
			},
			{
				key: 'tag_key_duplicate',
				dataType: DataTypes.String,
				type: MetricsType.Tag,
				id: createIdFromObjectFields(
					{
						dataType: DataTypes.String,
						key: 'tag_key_duplicate',
						type: MetricsType.Tag,
					},
					baseAutoCompleteIdKeysOrder,
				),
			},
			{
				key: 'tag_key_duplicate',
				dataType: DataTypes.String,
				type: MetricsType.Resource,
				id: createIdFromObjectFields(
					{
						dataType: DataTypes.String,
						key: 'tag_key_duplicate',
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
				'string' as DataTypes,
				MetricsType.Tag,
			);
			expect(result).toEqual(fieldTypeMockSourceList[0]);
		});

		it('should return matching element for Resource fieldType', () => {
			const result = chooseAutocompleteFromCustomValue(
				fieldTypeMockSourceList,
				'resource_key',
				'number' as DataTypes,
				MetricsType.Resource,
			);
			expect(result).toEqual(fieldTypeMockSourceList[1]);
		});

		it('should return matching element for Scope fieldType', () => {
			const result = chooseAutocompleteFromCustomValue(
				fieldTypeMockSourceList,
				'scope_key',
				'bool' as DataTypes,
				MetricsType.Scope,
			);
			expect(result).toEqual(fieldTypeMockSourceList[2]);
		});

		it('should return the correct duplicate with matching fieldType', () => {
			const result = chooseAutocompleteFromCustomValue(
				fieldTypeMockSourceList,
				'tag_key_duplicate',
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
				type: MetricsType.Tag,
				id: createIdFromObjectFields(
					{
						dataType: DataTypes.String,
						key: 'test_key',
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
				'string' as DataTypes,
				MetricsType.Resource,
			);
			expect(result).toEqual({
				...initialAutocompleteData,
				key: 'test_key',
				dataType: DataTypes.String,
				type: MetricsType.Resource,
			});
		});
	});

	describe('when element not found in sourceList but fieldType is provided', () => {
		it('should return new object with Tag fieldType', () => {
			const result = chooseAutocompleteFromCustomValue(
				mockSourceList,
				'new_key_with_tag_type',
				'string' as DataTypes,
				MetricsType.Tag,
			);
			expect(result).toEqual({
				...initialAutocompleteData,
				key: 'new_key_with_tag_type',
				dataType: DataTypes.String,
				type: MetricsType.Tag,
			});
		});

		it('should return new object with Resource fieldType', () => {
			const result = chooseAutocompleteFromCustomValue(
				mockSourceList,
				'new_key_with_resource_type',
				'number' as DataTypes,
				MetricsType.Resource,
			);
			expect(result).toEqual({
				...initialAutocompleteData,
				key: 'new_key_with_resource_type',
				dataType: DataTypes.Float64,
				type: MetricsType.Resource,
			});
		});

		it('should return new object with Scope fieldType', () => {
			const result = chooseAutocompleteFromCustomValue(
				mockSourceList,
				'new_key_with_scope_type',
				'bool' as DataTypes,
				MetricsType.Scope,
			);
			expect(result).toEqual({
				...initialAutocompleteData,
				key: 'new_key_with_scope_type',
				dataType: DataTypes.bool,
				type: MetricsType.Scope,
			});
		});

		it('should return new object with empty fieldType when undefined is passed', () => {
			const result = chooseAutocompleteFromCustomValue(
				mockSourceList,
				'new_key_with_undefined_type',
				'string' as DataTypes,
				undefined,
			);
			expect(result).toEqual({
				...initialAutocompleteData,
				key: 'new_key_with_undefined_type',
				dataType: DataTypes.String,
				type: '',
			});
		});

		it('should return new object with isJSON true and fieldType when not found', () => {
			const result = chooseAutocompleteFromCustomValue(
				mockSourceList,
				'json_not_found_with_type',
				'string' as DataTypes,
				MetricsType.Tag,
			);
			expect(result).toEqual({
				...initialAutocompleteData,
				key: 'json_not_found_with_type',
				dataType: DataTypes.String,
				type: MetricsType.Tag,
			});
		});
	});
});
