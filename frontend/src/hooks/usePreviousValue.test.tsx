import { renderHook } from '@testing-library/react';

import usePreviousValue from './usePreviousValue';

describe('usePreviousValue', () => {
	test('returns the previous value of a given variable', () => {
		const { result, rerender } = renderHook(
			({ value }) => usePreviousValue(value),
			{
				initialProps: { value: 1 },
				baseElement: document.body,
			},
		);

		expect(result.current).toBeUndefined();

		rerender({ value: 2 });

		expect(result.current).toBe(1);

		rerender({ value: 3 });

		expect(result.current).toBe(2);
	});

	test('works with different types of values', () => {
		const { result, rerender } = renderHook(
			({ value }) => usePreviousValue(value),
			{
				initialProps: { value: 'a' },
			},
		);

		expect(result.current).toBeUndefined();

		rerender({ value: 'b' });

		expect(result.current).toBe('a');

		rerender({ value: 'c' });
		expect(result.current).toBe('b');
	});
});
