import { type RefObject, useLayoutEffect, useMemo, useState } from 'react';

import type {
	OverflowBadgeItem,
	OverflowBadgesLayout,
	OverflowBadgesMeasurement,
} from './types';
import { computeOverflowBadgesLayout } from './utils';

/**
 * Fits the badges to the container's width, re-fitting on resize. Badge widths
 * are measured once per set of items, from a measuring row holding every badge
 * at its natural width followed by "+N", rendered only while `isMeasuring`.
 */
export function useOverflowBadgesLayout(
	items: OverflowBadgeItem[],
	containerRef: RefObject<HTMLElement>,
	measureRef: RefObject<HTMLElement>,
): OverflowBadgesLayout & { isMeasuring: boolean } {
	const itemsKey = items.map((item) => String(item.key)).join('\u0000');
	const [measurement, setMeasurement] =
		useState<OverflowBadgesMeasurement | null>(null);
	const [available, setAvailable] = useState(0);
	const isMeasuring = items.length > 0 && measurement?.itemsKey !== itemsKey;

	useLayoutEffect(() => {
		const container = containerRef.current;
		const measure = measureRef.current;
		if (!isMeasuring || !container || !measure) {
			return;
		}
		// Rounded up so sub-pixel widths never add up past the container.
		const badgeWidths = Array.from(measure.children, (el) =>
			Math.ceil(el.getBoundingClientRect().width),
		);
		const overflowWidth = badgeWidths.pop() ?? 0;
		setMeasurement({
			itemsKey,
			badgeWidths,
			overflowWidth,
			gap: parseFloat(getComputedStyle(container).columnGap) || 0,
		});
	}, [isMeasuring, itemsKey, containerRef, measureRef]);

	useLayoutEffect(() => {
		const container = containerRef.current;
		if (!container) {
			return undefined;
		}
		const update = (): void => setAvailable(container.clientWidth);
		update();
		const observer = new ResizeObserver(update);
		observer.observe(container);
		return (): void => observer.disconnect();
	}, [containerRef]);

	const layout = useMemo(
		(): OverflowBadgesLayout =>
			isMeasuring || !measurement || available === 0
				? { visibleCount: items.length }
				: computeOverflowBadgesLayout(
						available,
						measurement.gap,
						measurement.badgeWidths,
						measurement.overflowWidth,
					),
		[isMeasuring, measurement, available, items.length],
	);

	return { ...layout, isMeasuring };
}
