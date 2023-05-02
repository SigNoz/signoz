import { renderHook } from '@testing-library/react';

import { useIsValidTag } from './useIsValidTag';

describe('useIsValidTag', () => {
	test('returns correct validation result for SINGLE_VALUE operator type', () => {
		const { result } = renderHook(() => useIsValidTag('SINGLE_VALUE', 1));
		expect(result.current).toBe(true);

		const { result: result2 } = renderHook(() =>
			useIsValidTag('SINGLE_VALUE', 0),
		);
		expect(result2.current).toBe(false);
	});

	test('returns correct validation result for MULTIPLY_VALUE operator type', () => {
		const { result } = renderHook(() => useIsValidTag('MULTIPLY_VALUE', 1));
		expect(result.current).toBe(true);

		const { result: result2 } = renderHook(() =>
			useIsValidTag('MULTIPLY_VALUE', 0),
		);
		expect(result2.current).toBe(false);
	});

	test('returns correct validation result for NON_VALUE operator type', () => {
		const { result } = renderHook(() => useIsValidTag('NON_VALUE', 0));
		expect(result.current).toBe(true);

		const { result: result2 } = renderHook(() => useIsValidTag('NON_VALUE', 1));
		expect(result2.current).toBe(false);
	});

	test('returns correct validation result for NOT_VALID operator type', () => {
		const { result } = renderHook(() => useIsValidTag('NOT_VALID', 1));
		expect(result.current).toBe(false);

		const { result: result2 } = renderHook(() => useIsValidTag('NOT_VALID', 0));
		expect(result2.current).toBe(false);
	});
});
