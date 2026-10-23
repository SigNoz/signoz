import type { ReactNode } from 'react';
import { TestRouter } from 'tests/router';
import { renderHook } from 'tests/test-utils';

import { navigate } from '../navigation';
import { useAppLocation } from '../useAppLocation';

function wrapperAt(route: string) {
	return function Wrapper({ children }: { children: ReactNode }): JSX.Element {
		return <TestRouter initialRoute={route}>{children}</TestRouter>;
	};
}

describe('useAppLocation', () => {
	it('returns pathname, search and hash', () => {
		const { result } = renderHook(() => useAppLocation(), {
			wrapper: wrapperAt('/logs?a=1#top'),
		});

		expect(result.current).toMatchObject({
			pathname: '/logs',
			search: '?a=1',
			hash: '#top',
		});
	});

	it('returns the entry state', () => {
		navigate('/logs', { replace: true, state: { from: 'test' } });
		const { result } = renderHook(() => useAppLocation<{ from: string }>(), {
			wrapper: TestRouter,
		});

		expect(result.current.state.from).toBe('test');
	});

	it('defaults search and hash to empty strings', () => {
		const { result } = renderHook(() => useAppLocation(), {
			wrapper: wrapperAt('/logs'),
		});

		expect(result.current).toMatchObject({ search: '', hash: '' });
	});
});
