import { renderHook } from '@testing-library/react';
import { useBottomStripStore } from 'container/BottomStrip/store/useBottomStripStore';
import { StripItemKind, StripTone } from 'container/BottomStrip/types';

import { useTraceDetailsStripInfo } from '../useTraceDetailsStripInfo';

describe('useTraceDetailsStripInfo', () => {
	beforeEach(() => {
		useBottomStripStore.setState({ left: null, ownerId: null });
	});

	it('puts the span and error counts in the strip', () => {
		renderHook(() =>
			useTraceDetailsStripInfo({
				totalSpansCount: 600,
				totalErrorSpansCount: 4,
			}),
		);

		expect(useBottomStripStore.getState().left).toMatchObject([
			{ kind: StripItemKind.KeyValue, label: 'Spans', value: 600 },
			{
				kind: StripItemKind.KeyValue,
				label: 'Errors',
				value: 4,
				tone: StripTone.Error,
			},
		]);
	});

	it('leaves the error item untoned when nothing failed', () => {
		renderHook(() =>
			useTraceDetailsStripInfo({
				totalSpansCount: 600,
				totalErrorSpansCount: 0,
			}),
		);

		expect(useBottomStripStore.getState().left?.[1]).toMatchObject({
			value: 0,
			tone: StripTone.Default,
		});
	});

	it('clears the strip when the page unmounts', () => {
		const { unmount } = renderHook(() =>
			useTraceDetailsStripInfo({
				totalSpansCount: 600,
				totalErrorSpansCount: 4,
			}),
		);

		unmount();

		expect(useBottomStripStore.getState().left).toBeNull();
	});
});
