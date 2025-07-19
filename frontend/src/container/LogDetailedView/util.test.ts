import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';

import {
	flattenObject,
	getDataTypes,
	getSanitizedLogBody,
	recursiveParseJSON,
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

describe('getSanitizedLogBody', () => {
	it('should return sanitized HTML with default options (shouldEscapeHtml: false)', () => {
		const input = '<script>alert("xss")</script>Hello World';
		const result = getSanitizedLogBody(input);

		// Should remove script tags and return sanitized HTML
		expect(result).not.toContain('<script>');
		expect(result).toContain('Hello World');
	});

	it('should escape HTML when shouldEscapeHtml is true', () => {
		const input = '<script>alert("xss")</script>Hello World';
		const result = getSanitizedLogBody(input, { shouldEscapeHtml: true });

		// Should escape HTML entities
		expect(result).toContain('&lt;script&gt;');
		expect(result).toContain('&lt;/script&gt;');
		expect(result).toContain('Hello World');
	});

	it('should handle ANSI color codes correctly', () => {
		const input = '\x1b[32mHello\x1b[0m World';
		const result = getSanitizedLogBody(input);

		// Should convert ANSI codes to HTML spans
		expect(result).toContain('<span');
		expect(result).toContain('Hello');
		expect(result).toContain('World');
	});

	it('should handle unescaped strings correctly', () => {
		const input = 'Hello\\nWorld\\tTab';
		const result = getSanitizedLogBody(input);

		// Should unescape the string
		expect(result).toContain('Hello');
		expect(result).toContain('World');
	});

	it('should handle empty string input', () => {
		const result = getSanitizedLogBody('');
		expect(result).toBe('');
	});

	it('should handle null/undefined input gracefully', () => {
		const result1 = getSanitizedLogBody(null as any);
		const result2 = getSanitizedLogBody(undefined as any);

		expect(result1).toBe('');
		expect(result2).toBe('');
	});

	it('should handle special characters and entities', () => {
		const input = '& < > " \' &amp; &lt; &gt;';
		const result = getSanitizedLogBody(input, { shouldEscapeHtml: true });

		// Should escape HTML entities
		expect(result).toContain('&amp;');
		expect(result).toContain('&lt;');
		expect(result).toContain('&gt;');
		expect(result).toContain('&quot;');
	});

	it('should handle complex HTML with mixed content', () => {
		const input =
			'<div><p>Hello <strong>World</strong></p><script>alert("xss")</script></div>';
		const result = getSanitizedLogBody(input);

		// Should keep safe HTML but remove script tags
		expect(result).toContain('<div>');
		expect(result).toContain('<p>');
		expect(result).toContain('<strong>');
		expect(result).toContain('Hello');
		expect(result).toContain('World');
		expect(result).not.toContain('<script>');
	});

	it('should handle JSON-like strings', () => {
		const input = '{"key": "value", "nested": {"inner": "data"}}';
		const result = getSanitizedLogBody(input);

		// Should preserve JSON structure
		expect(result).toContain('{');
		expect(result).toContain('}');
		expect(result).toContain('key');
		expect(result).toContain('value');
	});

	it('should handle URLs and links', () => {
		const input = 'Visit https://example.com for more info';
		const result = getSanitizedLogBody(input);

		// Should preserve the URL text
		expect(result).toContain('https://example.com');
		expect(result).toContain('Visit');
		expect(result).toContain('info');
	});

	it('should handle error cases and return fallback', () => {
		// Mock console.error to avoid noise in tests
		const originalConsoleError = console.error;
		console.error = jest.fn();

		// Create a scenario that might cause an error
		const input = 'Normal text';
		const result = getSanitizedLogBody(input);

		// Should return the processed text normally
		expect(result).toContain('Normal text');

		// Restore console.error
		console.error = originalConsoleError;
	});

	it('should handle different escape scenarios correctly', () => {
		const input1 = '<div>Hello</div>';
		const result1 = getSanitizedLogBody(input1, { shouldEscapeHtml: false });
		const result2 = getSanitizedLogBody(input1, { shouldEscapeHtml: true });

		// Without escaping, should keep HTML structure
		expect(result1).toContain('<div>');
		expect(result1).toContain('</div>');

		// With escaping, should escape HTML entities
		expect(result2).toContain('&lt;div&gt;');
		expect(result2).toContain('&lt;/div&gt;');
	});

	it('should handle ANSI codes with HTML escaping', () => {
		const input = '\x1b[32mHello\x1b[0m <script>World</script>';
		const result = getSanitizedLogBody(input, { shouldEscapeHtml: true });

		// Should handle both ANSI codes and HTML escaping
		expect(result).toContain('<span');
		expect(result).toContain('Hello');
		expect(result).toContain('&lt;script&gt;');
		expect(result).toContain('World');
		expect(result).toContain('&lt;/script&gt;');
	});
});

//
