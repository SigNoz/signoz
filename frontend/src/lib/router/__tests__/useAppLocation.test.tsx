import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { renderHook } from '@testing-library/react';

import { useAppLocation } from '../useAppLocation';

function wrapperAt(entry: string | { pathname: string; state?: unknown }) {
	return function Wrapper({ children }: { children: ReactNode }): JSX.Element {
		return <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>;
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
		const { result } = renderHook(() => useAppLocation<{ from: string }>(), {
			wrapper: wrapperAt({ pathname: '/logs', state: { from: 'test' } }),
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
