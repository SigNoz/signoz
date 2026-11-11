import { renderHook } from '@testing-library/react';
import { useGetAlerts } from 'api/generated/services/alerts';
import { useBottomStripStore } from 'container/BottomStrip/store/useBottomStripStore';
import { StripItemKind } from 'container/BottomStrip/types';

import { useHomeStripInfo } from '../useHomeStripInfo';

jest.mock('api/generated/services/alerts', () => ({
	useGetAlerts: jest.fn(),
}));

const mockUseGetAlerts = useGetAlerts as jest.Mock;

describe('useHomeStripInfo', () => {
	beforeEach(() => {
		useBottomStripStore.setState({ left: null, ownerId: null });
	});

	it('counts the firing alert instances', () => {
		mockUseGetAlerts.mockReturnValue({ data: { data: [{}, {}, {}] } });

		renderHook(() => useHomeStripInfo());

		expect(useBottomStripStore.getState().left).toMatchObject([
			{ kind: StripItemKind.Text, text: '3 alerts firing' },
		]);
	});

	it('says alert, not alerts, when only one is firing', () => {
		mockUseGetAlerts.mockReturnValue({ data: { data: [{}] } });

		renderHook(() => useHomeStripInfo());

		expect(useBottomStripStore.getState().left?.[0]).toMatchObject({
			text: '1 alert firing',
		});
	});

	it('shows zero before the response lands', () => {
		mockUseGetAlerts.mockReturnValue({ data: undefined });

		renderHook(() => useHomeStripInfo());

		expect(useBottomStripStore.getState().left?.[0]).toMatchObject({
			text: '0 alerts firing',
		});
	});

	it('clears the strip when the page unmounts', () => {
		mockUseGetAlerts.mockReturnValue({ data: { data: [{}, {}, {}] } });

		const { unmount } = renderHook(() => useHomeStripInfo());

		unmount();

		expect(useBottomStripStore.getState().left).toBeNull();
	});
});
