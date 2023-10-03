import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';

import { flattenObject, getDataTypes, recursiveParseJSON } from './utils';

describe('recursiveParseJSON', () => {
	it('should return an empty object if the input is not valid JSON', () => {
		const result = recursiveParseJSON('not valid JSON');
		expect(result).toEqual({});
	});

	it('should return the parsed JSON object for valid JSON input', () => {
		const jsonString = '{"name": "John", "age": 30}';
		const result = recursiveParseJSON(jsonString);
		expect(result).toEqual({ name: 'John', age: 30 });
	});

	it('should recursively parse nested JSON objects', () => {
		const jsonString =
			'{"name": "John", "age": 30, "address": {"street": "123 Main St", "city": "Anytown", "state": "CA"}}';
		const result = recursiveParseJSON(jsonString);
		expect(result).toEqual({
			name: 'John',
			age: 30,
			address: {
				street: '123 Main St',
				city: 'Anytown',
				state: 'CA',
			},
		});
	});

	it('should recursively parse nested JSON arrays', () => {
		const jsonString = '[1, 2, [3, 4], {"foo": "bar"}]';
		const result = recursiveParseJSON(jsonString);
		expect(result).toEqual([1, 2, [3, 4], { foo: 'bar' }]);
	});

	it('should recursively parse deeply nested JSON objects', () => {
		const jsonString = '{"foo": {"bar": {"baz": {"qux": {"value": 42}}}}}';
		const result = recursiveParseJSON(jsonString);
		expect(result).toEqual({ foo: { bar: { baz: { qux: { value: 42 } } } } });
	});

	it('should handle JSON input that contains escaped characters', () => {
		const jsonString = '{"name": "John\\", \\"Doe", "age": 30}';
		const result = recursiveParseJSON(jsonString);
		expect(result).toEqual({ name: 'John", "Doe', age: 30 });
	});
});

describe('flattenObject in the objects recursively', () => {
	it('should flatten nested objects correctly', () => {
		const nestedObj = {
			a: {
				b: {
					c: 1,
					d: 2,
				},
				e: 3,
			},
			f: 4,
		};
		const expected = {
			'a.b.c': 1,
			'a.b.d': 2,
			'a.e': 3,
			f: 4,
		};

		expect(flattenObject(nestedObj)).toEqual(expected);
	});

	it('should return an empty object when input is empty', () => {
		const nestedObj = {};
		const expected = {};

		expect(flattenObject(nestedObj)).toEqual(expected);
	});

	it('should handle non-nested objects correctly', () => {
		const nestedObj = {
			a: 1,
			b: 2,
			c: 3,
		};
		const expected = {
			a: 1,
			b: 2,
			c: 3,
		};

		expect(flattenObject(nestedObj)).toEqual(expected);
	});

	it('should handle null and undefined correctly', () => {
		const nestedObj = {
			a: null,
			b: undefined,
		};
		const expected = {
			a: null,
			b: undefined,
		};

		expect(flattenObject(nestedObj)).toEqual(expected);
	});

	it('should handle arrays correctly', () => {
		const objWithArray = {
			a: [1, 2, 3],
			b: 2,
		};
		const expected = {
			a: [1, 2, 3],
			b: 2,
		};

		expect(flattenObject(objWithArray)).toEqual(expected);
	});

	it('should handle nested objects in arrays correctly', () => {
		const objWithArray = {
			a: [{ b: 1 }, { c: 2 }],
			d: 3,
		};
		const expected = {
			a: [{ b: 1 }, { c: 2 }],
			d: 3,
		};

		expect(flattenObject(objWithArray)).toEqual(expected);
	});

	it('should handle objects with arrays and nested objects correctly', () => {
		const complexObj = {
			a: {
				b: [1, 2, { c: 3 }],
				d: 4,
			},
			e: 5,
		};
		const expected = {
			'a.b': [1, 2, { c: 3 }],
			'a.d': 4,
			e: 5,
		};

		expect(flattenObject(complexObj)).toEqual(expected);
	});
});

describe('Get Data Types utils', () => {
	it('should return String for string input', () => {
		expect(getDataTypes('hello')).toBe(DataTypes.String);
	});

	it('should return Float64 for float input', () => {
		expect(getDataTypes(3.14)).toBe(DataTypes.Float64);
	});

	it('should return Int64 for integer input', () => {
		expect(getDataTypes(42)).toBe(DataTypes.Int64);
	});

	// Test for arrays
	it('should return ArrayString for string array input', () => {
		expect(getDataTypes(['hello', 'world'])).toBe(DataTypes.ArrayString);
	});

	it('should return ArrayFloat64 for float array input', () => {
		expect(getDataTypes([1.23, 4.56, 7.89])).toBe(DataTypes.ArrayFloat64);
	});

	it('should return ArrayInt64 for integer array input', () => {
		expect(getDataTypes([1, 2, 3])).toBe(DataTypes.ArrayInt64);
	});

	// Edge cases
	it('should return Empty for empty array input', () => {
		expect(getDataTypes([])).toBe(DataTypes.EMPTY);
	});

	it('should handle mixed array (return based on first element)', () => {
		expect(getDataTypes([1, 2.5, 3])).toBe(DataTypes.ArrayInt64);
		expect(getDataTypes([2.5, 3, 1])).toBe(DataTypes.ArrayFloat64);
	});
});
