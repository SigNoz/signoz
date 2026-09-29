import { renderHook } from '@testing-library/react';
import { StripItemKind, StripTone } from 'container/BottomStrip/types';

import { useStripInfo } from '../useStripInfo';

describe('useStripInfo', () => {
	it('describes the span and error counts as strip items', () => {
		const { result } = renderHook(() =>
			useStripInfo({ totalSpansCount: 600, totalErrorSpansCount: 4 }),
		);

		expect(result.current).toMatchObject([
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
		const { result } = renderHook(() =>
			useStripInfo({ totalSpansCount: 600, totalErrorSpansCount: 0 }),
		);

		expect(result.current[1]).toMatchObject({
			value: 0,
			tone: StripTone.Default,
		});
	});

	it('keeps the same array while the counts hold, so the strip is not rewritten', () => {
		const { result, rerender } = renderHook((props) => useStripInfo(props), {
			initialProps: { totalSpansCount: 600, totalErrorSpansCount: 4 },
		});
		const first = result.current;

		rerender({ totalSpansCount: 600, totalErrorSpansCount: 4 });

		expect(result.current).toBe(first);
	});
});
