import { safeNavigateMock } from '__tests__/safeNavigateMock';
import { useDashboardStore } from 'pages/DashboardPage/DashboardContainer/store/useDashboardStore';
import { act, AllTheProviders, renderHook } from 'tests/test-utils';

import { useFollowServiceSelection } from '../hooks/useFollowServiceSelection';

const DASHBOARD_ID = 'services-overview';

function selectService(service: string): void {
	act(() => {
		useDashboardStore.getState().setVariableValues(DASHBOARD_ID, {
			service_name: { value: service, allSelected: false },
		});
	});
}

describe('useFollowServiceSelection', () => {
	afterEach(() => {
		useDashboardStore.getState().setVariableValues(DASHBOARD_ID, {});
	});

	it('moves to the service picked after the page seeded its own', () => {
		selectService('cart');
		renderHook(() => useFollowServiceSelection(DASHBOARD_ID, 'cart'), {
			wrapper: AllTheProviders,
		});

		selectService('checkout api');

		expect(safeNavigateMock).toHaveBeenCalledWith(
			expect.stringMatching(/^\/services\/checkout%20api/),
		);
	});

	it('ignores a service left in the store from an earlier visit', () => {
		selectService('payments');
		renderHook(() => useFollowServiceSelection(DASHBOARD_ID, 'cart'), {
			wrapper: AllTheProviders,
		});

		expect(safeNavigateMock).not.toHaveBeenCalled();
	});
});
