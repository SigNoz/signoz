import { renderHook } from '@testing-library/react';

import { useIsValidTag } from '../useIsValidTag';

describe('useIsValidTag', () => {
	test('should correct value for SINGLE_VALUE operator type and result length of 1', () => {
		const operatorType = 'SINGLE_VALUE';
		const resultLength = 1;
		const { result } = renderHook(() =>
			useIsValidTag(operatorType, resultLength),
		);
		expect(result.current).toBe(true);
	});

	test('should false for SINGLE_VALUE operator type with result length greater than 1', () => {
		const operatorType = 'SINGLE_VALUE';
		const resultLength = 2;
		const { result } = renderHook(() =>
			useIsValidTag(operatorType, resultLength),
		);
		expect(result.current).toBe(false);
	});

	test('should correct value for MULTIPLY_VALUE operator type and result length of 3', () => {
		const operatorType = 'MULTIPLY_VALUE';
		const resultLength = 3;
		const { result } = renderHook(() =>
			useIsValidTag(operatorType, resultLength),
		);
		expect(result.current).toBe(true);
	});

	test('should false for MULTIPLY_VALUE operator type with result length of 0', () => {
		const operatorType = 'MULTIPLY_VALUE';
		const resultLength = 0;
		const { result } = renderHook(() =>
			useIsValidTag(operatorType, resultLength),
		);
		expect(result.current).toBe(false);
	});

	test('should correct value for NON_VALUE operator type and result length of 0', () => {
		const operatorType = 'NON_VALUE';
		const resultLength = 0;
		const { result } = renderHook(() =>
			useIsValidTag(operatorType, resultLength),
		);
		expect(result.current).toBe(true);
	});

	test('should false for NON_VALUE operator type with result length greater than 0', () => {
		const operatorType = 'NON_VALUE';
		const resultLength = 1;
		const { result } = renderHook(() =>
			useIsValidTag(operatorType, resultLength),
		);
		expect(result.current).toBe(false);
	});

	test('should correct value for NOT_VALID operator type', () => {
		const operatorType = 'NOT_VALID';
		const resultLength = 1;
		const { result } = renderHook(() =>
			useIsValidTag(operatorType, resultLength),
		);
		expect(result.current).toBe(false);
	});
});
