import {
	NumTypeQueryOperators,
	QueryOperatorsMultiVal,
	QueryTypes,
	StringTypeQueryOperators,
	ValidTypeSequence,
	ValidTypeValue,
} from './tokens';

describe('ValidTypeValue', () => {
	test('should return true for valid numeric values with number operators', () => {
		expect(ValidTypeValue(NumTypeQueryOperators.GTE, '42')).toBe(true);
		expect(ValidTypeValue(NumTypeQueryOperators.LT, '3.14')).toBe(true);
	});

	test('should return false for invalid numeric values with number operators', () => {
		expect(ValidTypeValue(NumTypeQueryOperators.GTE, 'abc')).toBe(false);
		expect(ValidTypeValue(NumTypeQueryOperators.LT, '12xyz')).toBe(false);
	});

	test('should return true for string values with string operators', () => {
		expect(ValidTypeValue(StringTypeQueryOperators.CONTAINS, 'example')).toBe(
			true,
		);
		expect(ValidTypeValue(StringTypeQueryOperators.NCONTAINS, 'test')).toBe(true);
	});

	test('should return true for any value with other operators', () => {
		expect(ValidTypeValue('anything', 'whatever')).toBe(true);
		expect(ValidTypeValue(QueryOperatorsMultiVal.IN, ['1', '2', '3'])).toBe(true);
	});

	test('should return false if value is array', () => {
		expect(ValidTypeValue(NumTypeQueryOperators.GTE, ['1', '2', '3'])).toBe(
			false,
		);
	});
});

describe('ValidTypeSequence', () => {
	test('should return true for valid type sequences', () => {
		expect(
			ValidTypeSequence(
				undefined,
				QueryTypes.QUERY_KEY,
				QueryTypes.CONDITIONAL_OPERATOR,
			),
		).toBe(true);
		expect(
			ValidTypeSequence(
				QueryTypes.QUERY_KEY,
				QueryTypes.QUERY_OPERATOR,
				QueryTypes.QUERY_VALUE,
			),
		).toBe(true);
		expect(
			ValidTypeSequence(
				QueryTypes.QUERY_OPERATOR,
				QueryTypes.QUERY_VALUE,
				undefined,
			),
		).toBe(true);
	});

	test('should return false for invalid type sequences', () => {
		expect(
			ValidTypeSequence(
				undefined,
				QueryTypes.QUERY_OPERATOR,
				QueryTypes.QUERY_VALUE,
			),
		).toBe(false);
		expect(
			ValidTypeSequence(
				QueryTypes.QUERY_KEY,
				QueryTypes.QUERY_VALUE,
				QueryTypes.QUERY_OPERATOR,
			),
		).toBe(false);
		expect(
			ValidTypeSequence(
				QueryTypes.QUERY_OPERATOR,
				QueryTypes.QUERY_KEY,
				QueryTypes.QUERY_VALUE,
			),
		).toBe(false);
		expect(
			ValidTypeSequence(
				QueryTypes.QUERY_VALUE,
				QueryTypes.QUERY_OPERATOR,
				undefined,
			),
		).toBe(false);
		expect(
			ValidTypeSequence(
				QueryTypes.CONDITIONAL_OPERATOR,
				QueryTypes.QUERY_OPERATOR,
				QueryTypes.QUERY_KEY,
			),
		).toBe(false);
		expect(
			ValidTypeSequence(
				QueryTypes.CONDITIONAL_OPERATOR,
				undefined,
				QueryTypes.QUERY_KEY,
			),
		).toBe(false);
		expect(
			ValidTypeSequence(
				QueryTypes.QUERY_KEY,
				QueryTypes.CONDITIONAL_OPERATOR,
				undefined,
			),
		).toBe(false);
	});
});
