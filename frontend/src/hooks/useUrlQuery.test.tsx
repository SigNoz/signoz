import { act, renderHook } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Router } from 'react-router-dom';

import useUrlQuery from './useUrlQuery';

describe('useUrlQuery', () => {
	test('returns URLSearchParams object for the current URL search', () => {
		const history = createMemoryHistory({
			initialEntries: ['/test?param1=value1&param2=value2'],
		});

		const { result } = renderHook(() => useUrlQuery(), {
			wrapper: ({ children }) => <Router history={history}>{children}</Router>,
		});

		expect(result.current.get('param1')).toBe('value1');
		expect(result.current.get('param2')).toBe('value2');
	});

	test('updates URLSearchParams object when URL search changes', () => {
		const history = createMemoryHistory({
			initialEntries: ['/test?param1=value1'],
		});

		const { result, rerender } = renderHook(() => useUrlQuery(), {
			wrapper: ({ children }) => <Router history={history}>{children}</Router>,
		});

		expect(result.current.get('param1')).toBe('value1');
		expect(result.current.get('param2')).toBe(null);

		act(() => {
			history.push('/test?param1=newValue1&param2=value2');
		});

		rerender();

		expect(result.current.get('param1')).toBe('newValue1');
		expect(result.current.get('param2')).toBe('value2');
	});

	test('returns empty URLSearchParams object when no query parameters are present', () => {
		const history = createMemoryHistory({
			initialEntries: ['/test'],
		});

		const { result } = renderHook(() => useUrlQuery(), {
			wrapper: ({ children }) => <Router history={history}>{children}</Router>,
		});

		expect(result.current.toString()).toBe('');
		expect(result.current.get('param1')).toBe(null);
		expect(result.current.get('param2')).toBe(null);
	});
});
