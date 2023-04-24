import { renderHook } from '@testing-library/react';
import { AttributeKeyOptions } from 'api/queryBuilder/getAttributesKeysValues';

import { useSetCurrentKeyAndOperator } from '../useSetCurrentKeyAndOperator';

describe('useSetCurrentKeyAndOperator', () => {
	const keys: AttributeKeyOptions[] = [
		{ key: 'color', dataType: 'string', type: 'tag', isColumn: false },
		{ key: 'size', dataType: 'number', type: 'tag', isColumn: false },
		{ key: 'material', dataType: 'boolean', type: 'tag', isColumn: false },
	];

	test('should return an empty array when the input value is an empty string', () => {
		const { result } = renderHook(() => useSetCurrentKeyAndOperator('', keys));
		expect(result.current).toEqual(['', '', []]);
	});

	test('should return an empty array when the input value does not contain any space or valid key', () => {
		const { result } = renderHook(() =>
			useSetCurrentKeyAndOperator('hello', keys),
		);
		expect(result.current).toEqual(['', '', []]);
	});

	test('should return an empty array when the input key is not a valid attribute key', () => {
		const { result } = renderHook(() =>
			useSetCurrentKeyAndOperator('brand:apple red', keys),
		);
		expect(result.current).toEqual(['brand:apple', 'red', []]);
	});

	test('should return the correct key, operator, and result when the input value is a valid key-value pair with a single result', () => {
		const { result } = renderHook(() =>
			useSetCurrentKeyAndOperator('color:red', keys),
		);
		expect(result.current).toEqual(['', '', []]);
	});

	test('should return the correct key, operator, and result when the input value is a valid key-value pair with multiple results', () => {
		const { result } = renderHook(() =>
			useSetCurrentKeyAndOperator('size:>10 <20', keys),
		);
		expect(result.current).toStrictEqual(['size:>10', '<20', []]);
	});

	test('should return the correct key, operator, and result when the input value is a valid key-value pair with an operator and a single result', () => {
		const { result } = renderHook(() =>
			useSetCurrentKeyAndOperator('material:"cotton wool"', keys),
		);
		expect(result.current).toEqual(['material:"cotton', 'wool"', []]);
	});

	test('should return the correct key, operator, and result when the input value contains additional spaces before and/or after the key-value pair', () => {
		const { result } = renderHook(() =>
			useSetCurrentKeyAndOperator('   color =  blue   ', keys),
		);
		expect(result.current).toStrictEqual(['', '', [' color =  blue   ']]);
	});

	test('should return the correct key, operator, and result no space', () => {
		const { result } = renderHook(() =>
			useSetCurrentKeyAndOperator('color =  red ', keys),
		);
		expect(result.current).toStrictEqual(['color', '=', [' red ']]);
	});

	test('should return the correct key, operator, and result when the input value is a suggested attribute key', () => {
		const { result } = renderHook(() =>
			useSetCurrentKeyAndOperator('color ', keys),
		);
		expect(result.current).toEqual(['color', '', []]);
	});

	test('should return the correct key, operator, and result when the input value', () => {
		const { result } = renderHook(() =>
			useSetCurrentKeyAndOperator('color = red', keys),
		);
		expect(result.current).toEqual(['color', '=', ['red']]);
	});

	test('should return the correct key, operator, and result', () => {
		const { result } = renderHook(() =>
			useSetCurrentKeyAndOperator('color = ', keys),
		);
		expect(result.current).toEqual(['color', '=', []]);
	});

	test('should the correct key and operator in EXISTS', () => {
		const { result } = renderHook(() =>
			useSetCurrentKeyAndOperator('color EXISTS', keys),
		);
		expect(result.current).toEqual(['color', 'EXISTS', []]);
	});

	test('should the correct key and operator in NOT_EXISTS', () => {
		const { result } = renderHook(() =>
			useSetCurrentKeyAndOperator('color NOT_EXISTS', keys),
		);
		expect(result.current).toEqual(['color', 'NOT_EXISTS', []]);
	});

	test('should the correct key and operator in IN', () => {
		const { result } = renderHook(() =>
			useSetCurrentKeyAndOperator('color IN red, green, yellow', keys),
		);
		expect(result.current).toEqual(['color', 'IN', ['red,', 'green,', 'yellow']]);
	});

	test('should the correct key and operator in NOT_IN', () => {
		const { result } = renderHook(() =>
			useSetCurrentKeyAndOperator('color NOT_IN red, green, yellow', keys),
		);
		expect(result.current).toEqual([
			'color',
			'NOT_IN',
			['red,', 'green,', 'yellow'],
		]);
	});
});
