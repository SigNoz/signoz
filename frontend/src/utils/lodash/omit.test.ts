import { omit } from './omit';

describe('omit lodash util function', () => {
	test('should omit multiple keys from object', () => {
		const object = { a: 'value1', b: 'value2', c: 'value3' };
		const keys = ['a', 'c'];
		const expected = { b: 'value2' };

		expect(omit(keys, object)).toEqual(expected);
	});

	test('should omit single key from object', () => {
		const object = { a: 'value1', b: 'value2', c: 'value3' };
		const key = 'a';
		const expected = { b: 'value2', c: 'value3' };

		expect(omit(key, object)).toEqual(expected);
	});

	test('should not omit key from object if key does not exist', () => {
		const object = { a: 'value1', b: 'value2', c: 'value3' };
		const key = 'd';
		const expected = { a: 'value1', b: 'value2', c: 'value3' };

		expect(omit(key, object)).toEqual(expected);
	});
});
