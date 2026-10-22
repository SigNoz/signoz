import { omitBlank } from '../omitBlank';

describe('omitBlank', () => {
	it.each([
		['an empty string', ''],
		['null', null],
		['undefined', undefined],
		['an empty array', []],
		['an empty object', {}],
	])('drops %s', (_label, blank) => {
		expect(omitBlank({ kept: 'value', dropped: blank })).toStrictEqual({
			kept: 'value',
		});
	});

	it.each([
		['false', false],
		['zero', 0],
		['an array with an entry', [1]],
		['an object with a key', { a: 1 }],
	])('keeps %s', (_label, value) => {
		expect(omitBlank({ value })).toStrictEqual({ value });
	});
});
