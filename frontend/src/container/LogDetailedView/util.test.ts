import { recursiveParseJSON } from './utils';

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
