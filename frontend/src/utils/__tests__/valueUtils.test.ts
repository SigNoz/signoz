import {
	defaultTo,
	isArray,
	isBoolean,
	isFinite,
	isFunction,
	isNaN,
	isNil,
	isNull,
	isNumber,
	isString,
	isUndefined,
	keys,
	noop,
} from '../valueUtils';

describe('valueUtils', () => {
	describe('defaultTo', () => {
		it('returns the fallback for null, undefined, and NaN', () => {
			expect(defaultTo(null, 'fallback')).toBe('fallback');
			expect(defaultTo(undefined, 'fallback')).toBe('fallback');
			expect(defaultTo(Number.NaN, 'fallback')).toBe('fallback');
		});

		it('keeps falsey values that are valid values', () => {
			expect(defaultTo('', 'fallback')).toBe('');
			expect(defaultTo(false, true)).toBe(false);
			expect(defaultTo(0, 1)).toBe(0);
		});

		it('preserves boxed NaN values like lodash-es', () => {
			const boxedNaN = new Number(Number.NaN);

			expect(defaultTo(boxedNaN, 'fallback')).toBe(boxedNaN);
		});
	});

	it('checks arrays with native Array.isArray semantics', () => {
		expect(isArray([])).toBe(true);
		expect(isArray({ length: 0 })).toBe(false);
	});

	it('checks booleans, including boxed booleans', () => {
		expect(isBoolean(false)).toBe(true);
		expect(isBoolean(new Boolean(true))).toBe(true);
		expect(isBoolean('true')).toBe(false);
	});

	it('checks finite primitive numbers only', () => {
		expect(isFinite(1)).toBe(true);
		expect(isFinite(Number.POSITIVE_INFINITY)).toBe(false);
		expect(isFinite(new Number(1))).toBe(false);
	});

	it('checks functions', () => {
		expect(isFunction(() => undefined)).toBe(true);
		expect(isFunction(class Example {})).toBe(true);
		expect(isFunction({})).toBe(false);
	});

	it('checks NaN values without matching other non-numeric values', () => {
		expect(isNaN(Number.NaN)).toBe(true);
		expect(isNaN(new Number(Number.NaN))).toBe(true);
		expect(isNaN(undefined)).toBe(false);
		expect(isNaN('abc')).toBe(false);
	});

	it('checks nullish values', () => {
		expect(isNil(null)).toBe(true);
		expect(isNil(undefined)).toBe(true);
		expect(isNil(false)).toBe(false);
	});

	it('checks null and undefined independently', () => {
		expect(isNull(null)).toBe(true);
		expect(isNull(undefined)).toBe(false);
		expect(isUndefined(undefined)).toBe(true);
		expect(isUndefined(null)).toBe(false);
	});

	it('checks numbers and strings, including boxed values', () => {
		expect(isNumber(1)).toBe(true);
		expect(isNumber(new Number(1))).toBe(true);
		expect(isNumber('1')).toBe(false);
		expect(isString('value')).toBe(true);
		expect(isString(new String('value'))).toBe(true);
		expect(isString(1)).toBe(false);
	});

	it('does not match objects that spoof native tags', () => {
		expect(isBoolean({ [Symbol.toStringTag]: 'Boolean' })).toBe(false);
		expect(isNumber({ [Symbol.toStringTag]: 'Number' })).toBe(false);
		expect(isString({ [Symbol.toStringTag]: 'String' })).toBe(false);
	});

	it('returns own enumerable keys and safely handles nullish values', () => {
		expect(keys({ first: 1, second: 2 })).toStrictEqual(['first', 'second']);
		expect(keys('abc')).toStrictEqual(['0', '1', '2']);
		expect(keys(null)).toStrictEqual([]);
		expect(keys(undefined)).toStrictEqual([]);
	});

	it('provides a no-op function', () => {
		expect(noop()).toBeUndefined();
	});
});
