import { useLayoutEffect, useState } from 'react';

import type { Obstacle } from './types';
import { getRightClearance, SLIDE_DURATION_MS, watchObstacles } from './utils';

// The popover moves a frame or two after the obstacle changes.
const SETTLE_MS = SLIDE_DURATION_MS + 100;

interface PopoverAvoidance {
	/** Room the obstacles take from the viewport's right edge; keep the popover left of it. */
	clearance: number;
	/** True while moving aside for an obstacle, or back once it hides. */
	isSliding: boolean;
}

/** Keeps a popover clear of `obstacles` while `enabled`; keep the array stable across renders. */
export function usePopoverAvoidance(
	obstacles: Obstacle[],
	enabled: boolean,
): PopoverAvoidance {
	const [clearance, setClearance] = useState(0);
	const [isSliding, setIsSliding] = useState(false);

	// Before paint, so the popover opens beside an obstacle instead of sliding there.
	useLayoutEffect(() => {
		if (!enabled) {
			return undefined;
		}
		let current: number | undefined;
		let slideTimer: ReturnType<typeof setTimeout> | undefined;

		const stopWatching = watchObstacles(obstacles, (rects) => {
			const next = getRightClearance(rects);
			if (next === current) {
				return;
			}
			const isFirst = current === undefined;
			current = next;
			setClearance(next);
			if (isFirst) {
				return;
			}
			setIsSliding(true);
			clearTimeout(slideTimer);
			slideTimer = setTimeout(() => setIsSliding(false), SETTLE_MS);
		});

		return (): void => {
			stopWatching();
			clearTimeout(slideTimer);
			setIsSliding(false);
		};
	}, [enabled, obstacles]);

	return { clearance, isSliding };
}
