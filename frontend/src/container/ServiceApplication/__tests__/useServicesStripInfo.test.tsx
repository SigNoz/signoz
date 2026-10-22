import { renderHook } from '@testing-library/react';
import { useBottomStripStore } from 'container/BottomStrip/store/useBottomStripStore';
import { StripItemKind } from 'container/BottomStrip/types';

import { useServicesStripInfo } from '../useServicesStripInfo';

describe('useServicesStripInfo', () => {
	beforeEach(() => {
		useBottomStripStore.setState({ left: null, ownerId: null });
	});

	it('shows how many services are listed', () => {
		renderHook(() => useServicesStripInfo(18));

		expect(useBottomStripStore.getState().left).toMatchObject([
			{ kind: StripItemKind.Text, text: '18 services' },
		]);
	});

	it('says service, not services, when there is one', () => {
		renderHook(() => useServicesStripInfo(1));

		expect(useBottomStripStore.getState().left?.[0]).toMatchObject({
			text: '1 service',
		});
	});

	it('shows zero when there are none', () => {
		renderHook(() => useServicesStripInfo(0));

		expect(useBottomStripStore.getState().left?.[0]).toMatchObject({
			text: '0 services',
		});
	});

	it('clears the strip when the page unmounts', () => {
		const { unmount } = renderHook(() => useServicesStripInfo(18));

		unmount();

		expect(useBottomStripStore.getState().left).toBeNull();
	});
});
