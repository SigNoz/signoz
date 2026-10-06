import { renderHook } from '@testing-library/react';
import { useBottomStripStore } from 'container/BottomStrip/store/useBottomStripStore';
import { StripItemKind } from 'container/BottomStrip/types';

import { useAlertRulesStripInfo } from '../useAlertRulesStripInfo';

describe('useAlertRulesStripInfo', () => {
	beforeEach(() => {
		useBottomStripStore.setState({ left: null, ownerId: null });
	});

	it('shows the rows on the page against the total', () => {
		renderHook(() => useAlertRulesStripInfo({ shownCount: 15, totalCount: 17 }));

		expect(useBottomStripStore.getState().left).toMatchObject([
			{ kind: StripItemKind.Text, text: '15 of 17 rules' },
		]);
	});

	it('still says n of m when the whole list fits on one page', () => {
		renderHook(() => useAlertRulesStripInfo({ shownCount: 17, totalCount: 17 }));

		expect(useBottomStripStore.getState().left?.[0]).toMatchObject({
			text: '17 of 17 rules',
		});
	});

	it('says rule, not rules, when there is only one', () => {
		renderHook(() => useAlertRulesStripInfo({ shownCount: 1, totalCount: 1 }));

		expect(useBottomStripStore.getState().left?.[0]).toMatchObject({
			text: '1 of 1 rule',
		});
	});

	it('shows zero when nothing matched', () => {
		renderHook(() => useAlertRulesStripInfo({ shownCount: 0, totalCount: 12 }));

		expect(useBottomStripStore.getState().left?.[0]).toMatchObject({
			text: '0 of 12 rules',
		});
	});

	it('clears the strip when the page unmounts', () => {
		const { unmount } = renderHook(() =>
			useAlertRulesStripInfo({ shownCount: 15, totalCount: 17 }),
		);

		unmount();

		expect(useBottomStripStore.getState().left).toBeNull();
	});
});
