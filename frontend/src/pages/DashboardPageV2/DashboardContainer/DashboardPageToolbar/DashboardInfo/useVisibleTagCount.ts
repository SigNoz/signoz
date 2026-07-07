import { useCallback, useEffect, useRef, useState } from 'react';
import {
	BADGE_GAP,
	estimateBadgeWidth,
	OVERFLOW_BADGE_WIDTH,
} from 'components/Alerts/LabelColumn/utils';

interface Result {
	containerRef: React.RefObject<HTMLDivElement>;
	visibleCount: number;
}

/**
 * Measures how many tags fit in the container and returns the visible count,
 * reserving room for the `+N` overflow badge. Reuses the badge-width estimation
 * from the alerts LabelColumn so dashboards and alerts overflow identically.
 */
export function useVisibleTagCount(tags: string[]): Result {
	const containerRef = useRef<HTMLDivElement>(null);
	const [visibleCount, setVisibleCount] = useState(tags.length);

	const calculateVisible = useCallback(
		(width: number): number => {
			if (width <= 0) {
				return 1;
			}
			const availableWidth = width - OVERFLOW_BADGE_WIDTH - BADGE_GAP;
			let usedWidth = 0;
			let count = 0;
			for (const tag of tags) {
				const badgeWidth = estimateBadgeWidth(tag) + BADGE_GAP;
				if (usedWidth + badgeWidth > availableWidth && count > 0) {
					break;
				}
				usedWidth += badgeWidth;
				count += 1;
			}
			return Math.max(1, count);
		},
		[tags],
	);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) {
			return undefined;
		}
		const observer = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (entry && entry.contentRect.width > 0) {
				setVisibleCount(calculateVisible(entry.contentRect.width));
			}
		});
		observer.observe(container);
		if (container.clientWidth > 0) {
			setVisibleCount(calculateVisible(container.clientWidth));
		}
		return (): void => observer.disconnect();
	}, [calculateVisible]);

	return { containerRef, visibleCount };
}
