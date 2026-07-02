import { renderHook } from '@testing-library/react';

import { usePageTitle } from '../usePageTitle';

describe('usePageTitle', () => {
	it('stacks titles most specific first and pops on unmount', () => {
		const root = renderHook(() => usePageTitle('SigNoz'));
		const page = renderHook(() => usePageTitle('Dashboards'));
		const detail = renderHook(({ title }) => usePageTitle(title), {
			initialProps: { title: 'My Dashboard' },
		});

		expect(document.title).toBe('My Dashboard | Dashboards | SigNoz');

		detail.rerender({ title: 'Renamed Dashboard' });
		expect(document.title).toBe('Renamed Dashboard | Dashboards | SigNoz');

		detail.unmount();
		expect(document.title).toBe('Dashboards | SigNoz');

		page.unmount();
		expect(document.title).toBe('SigNoz');

		root.unmount();
	});

	it('contributes nothing while title is undefined', () => {
		const root = renderHook(() => usePageTitle('SigNoz'));
		const detail = renderHook(({ title }: { title?: string }) => usePageTitle(title), {
			initialProps: {},
		});

		expect(document.title).toBe('SigNoz');

		detail.rerender({ title: 'Loaded' });
		expect(document.title).toBe('Loaded | SigNoz');

		detail.unmount();
		root.unmount();
	});
});
