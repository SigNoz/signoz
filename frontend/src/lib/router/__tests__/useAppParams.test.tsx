import type { ReactNode } from 'react';
import { TestRouter } from 'tests/router';
import { renderHook } from 'tests/test-utils';

import { useAppParams } from '../useAppParams';

function wrapperAt(route: string, routePath: string) {
	return function Wrapper({ children }: { children: ReactNode }): JSX.Element {
		return (
			<TestRouter initialRoute={route} routePath={routePath}>
				{children}
			</TestRouter>
		);
	};
}

describe('useAppParams', () => {
	it('reads a param with the record generic', () => {
		const { result } = renderHook(() => useAppParams<{ roleId: string }>(), {
			wrapper: wrapperAt('/settings/roles/1f8b', '/settings/roles/:roleId'),
		});

		expect(result.current.roleId).toBe('1f8b');
	});

	it('reads a param with the key-union generic', () => {
		const { result } = renderHook(() => useAppParams<'roleId'>(), {
			wrapper: wrapperAt('/settings/roles/1f8b', '/settings/roles/:roleId'),
		});

		expect(result.current.roleId).toBe('1f8b');
	});

	it('reads multiple params', () => {
		const { result } = renderHook(
			() => useAppParams<'dashboardId' | 'panelId'>(),
			{
				wrapper: wrapperAt(
					'/dashboard/d1/new-panel/p2',
					'/dashboard/:dashboardId/new-panel/:panelId',
				),
			},
		);

		expect(result.current).toMatchObject({ dashboardId: 'd1', panelId: 'p2' });
	});

	it('returns an empty object on a route without params', () => {
		const { result } = renderHook(() => useAppParams(), {
			wrapper: wrapperAt('/logs', '/logs'),
		});

		expect(result.current).toStrictEqual({});
	});
});
