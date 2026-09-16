import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';

import {
	flattenObject,
	getDataTypes,
	MAX_RECURSIVE_DEPTH,
	MAX_SAFE_STRING_LENGTH,
	recursiveParseJSON,
	removeEscapeCharacters,
	removeExtraSpaces,
	removeObjectFromString,
	unescapeString,
} from './utils';

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

	it('should return an empty object if input exceeds MAX_SAFE_STRING_LENGTH', () => {
		const longJSON = JSON.stringify({
			data: 'a'.repeat(MAX_SAFE_STRING_LENGTH + 1),
		});
		const result = recursiveParseJSON(longJSON);
		expect(result).toEqual({});
	});

	it('should gracefully handle deep nesting beyond MAX_RECURSIVE_DEPTH without stack overflow', () => {
		let deepJson = '{"val": "base"}';
		for (let i = 0; i < MAX_RECURSIVE_DEPTH + 15; i += 1) {
			deepJson = `{"nested": ${deepJson}}`;
		}
		expect(() => recursiveParseJSON(deepJson)).not.toThrow();
	});

	it('should return an empty object for empty or non-string inputs', () => {
		expect(recursiveParseJSON('')).toEqual({});
		// @ts-ignore
		expect(recursiveParseJSON(null)).toEqual({});
		// @ts-ignore
		expect(recursiveParseJSON(undefined)).toEqual({});
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

describe('removeEscapeCharacters', () => {
	it('should remove escape characters correctly for standard strings', () => {
		const input = '\\x1b[32mSuccess\\x1b[0m and \\u001b[31mError\\u001b[0m\\n';
		const expected = 'Success and Error';
		expect(removeEscapeCharacters(input)).toBe(expected);
	});

	it('should return empty string for null, undefined, or empty string', () => {
		expect(removeEscapeCharacters('')).toBe('');
		// @ts-ignore
		expect(removeEscapeCharacters(null)).toBe('');
		// @ts-ignore
		expect(removeEscapeCharacters(undefined)).toBe('');
	});

	it('should return unmodified string when length exceeds MAX_SAFE_STRING_LENGTH', () => {
		const longString = 'a'.repeat(MAX_SAFE_STRING_LENGTH + 100);
		const result = removeEscapeCharacters(longString);
		expect(result).toBe(longString);
		expect(result.length).toBe(longString.length);
	});

	it('should safely handle 500,000+ character strings without blowing call stack', () => {
		const hugeString = '\\x1b[32m'.repeat(65000); // 520,000 chars
		expect(() => {
			const result = removeEscapeCharacters(hugeString);
			expect(result).toBe(hugeString);
		}).not.toThrow();
	});
});

describe('unescapeString', () => {
	it('should unescape standard escape sequences', () => {
		const input = 'Hello\\nWorld\\t\\r\\\\\\\'\\"';
		const expected = 'Hello\nWorld\t\r\\\'"';
		expect(unescapeString(input)).toBe(expected);
	});

	it('should unescape hex and unicode escape sequences', () => {
		const input = '\\x41 and \\u0042';
		const expected = 'A and B';
		expect(unescapeString(input)).toBe(expected);
	});

	it('should return empty string for null, undefined, or empty string', () => {
		expect(unescapeString('')).toBe('');
		// @ts-ignore
		expect(unescapeString(null)).toBe('');
		// @ts-ignore
		expect(unescapeString(undefined)).toBe('');
	});

	it('should return unmodified string when length exceeds MAX_SAFE_STRING_LENGTH', () => {
		const longString = '\\n'.repeat(MAX_SAFE_STRING_LENGTH);
		const result = unescapeString(longString);
		expect(result).toBe(longString);
		expect(result.length).toBe(longString.length);
	});

	it('should safely handle 500,000+ character strings without blowing call stack', () => {
		const hugeString = '\\u0041'.repeat(100000); // 600,000 chars
		expect(() => {
			const result = unescapeString(hugeString);
			expect(result).toBe(hugeString);
		}).not.toThrow();
	});
});

describe('removeExtraSpaces', () => {
	it('should normalize extra spaces and trim', () => {
		expect(removeExtraSpaces('   hello   world   ')).toBe('hello world');
	});

	it('should return trimmed string without regex when exceeding MAX_SAFE_STRING_LENGTH', () => {
		const longString = '  ' + 'a'.repeat(MAX_SAFE_STRING_LENGTH + 10) + '  ';
		const result = removeExtraSpaces(longString);
		expect(result).toBe('a'.repeat(MAX_SAFE_STRING_LENGTH + 10));
	});
});

describe('removeObjectFromString', () => {
	it('should remove [object Object]. pattern', () => {
		expect(removeObjectFromString('[object Object].test')).toBe('test');
	});

	it('should return unmodified string when exceeding MAX_SAFE_STRING_LENGTH', () => {
		const longString = 'a'.repeat(MAX_SAFE_STRING_LENGTH + 10);
		expect(removeObjectFromString(longString)).toBe(longString);
	});
});
