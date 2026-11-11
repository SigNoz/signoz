import { renderHook } from '@testing-library/react';
import { useBottomStripStore } from 'container/BottomStrip/store/useBottomStripStore';
import { StripItemKind } from 'container/BottomStrip/types';

import { useExceptionsStripInfo } from '../useExceptionsStripInfo';

describe('useExceptionsStripInfo', () => {
	beforeEach(() => {
		useBottomStripStore.setState({ left: null, ownerId: null });
	});

	it('shows the rows on the page against the total', () => {
		renderHook(() => useExceptionsStripInfo({ shownCount: 25, totalCount: 500 }));

		expect(useBottomStripStore.getState().left).toMatchObject([
			{ kind: StripItemKind.Text, text: '25 of 500 exceptions' },
		]);
	});

	it('still says n of m when the whole list fits on one page', () => {
		renderHook(() => useExceptionsStripInfo({ shownCount: 42, totalCount: 42 }));

		expect(useBottomStripStore.getState().left?.[0]).toMatchObject({
			text: '42 of 42 exceptions',
		});
	});

	it('says exception, not exceptions, when there is one', () => {
		renderHook(() => useExceptionsStripInfo({ shownCount: 1, totalCount: 1 }));

		expect(useBottomStripStore.getState().left?.[0]).toMatchObject({
			text: '1 of 1 exception',
		});
	});

	it('shows zero before the counts land', () => {
		renderHook(() => useExceptionsStripInfo({ shownCount: 0, totalCount: 0 }));

		expect(useBottomStripStore.getState().left?.[0]).toMatchObject({
			text: '0 of 0 exceptions',
		});
	});

	it('clears the strip when the page unmounts', () => {
		const { unmount } = renderHook(() =>
			useExceptionsStripInfo({ shownCount: 25, totalCount: 500 }),
		);

		unmount();

		expect(useBottomStripStore.getState().left).toBeNull();
	});
});
