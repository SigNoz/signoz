import { act, renderHook } from '@testing-library/react';
import { navigate } from 'lib/router/navigation';
import { TestRouter } from 'tests/router';

import useUrlQuery from './useUrlQuery';

describe('useUrlQuery', () => {
	it('returns URLSearchParams object for the current URL search', () => {
		const { result } = renderHook(() => useUrlQuery(), {
			wrapper: ({ children }) => (
				<TestRouter initialRoute="/test?param1=value1&param2=value2">
					{children}
				</TestRouter>
			),
		});

		expect(result.current.get('param1')).toBe('value1');
		expect(result.current.get('param2')).toBe('value2');
	});

	it('updates URLSearchParams object when URL search changes', () => {
		const { result, rerender } = renderHook(() => useUrlQuery(), {
			wrapper: ({ children }) => (
				<TestRouter initialRoute="/test?param1=value1">{children}</TestRouter>
			),
		});

		expect(result.current.get('param1')).toBe('value1');
		expect(result.current.get('param2')).toBeNull();

		act(() => {
			navigate('/test?param1=newValue1&param2=value2');
		});

		rerender();

		expect(result.current.get('param1')).toBe('newValue1');
		expect(result.current.get('param2')).toBe('value2');
	});

	it('returns empty URLSearchParams object when no query parameters are present', () => {
		const { result } = renderHook(() => useUrlQuery(), {
			wrapper: ({ children }) => (
				<TestRouter initialRoute="/test">{children}</TestRouter>
			),
		});

		expect(result.current.toString()).toBe('');
		expect(result.current.get('param1')).toBeNull();
		expect(result.current.get('param2')).toBeNull();
	});
});
