import { useLayoutEffect, useState } from 'react';

import type { Obstacle } from './types';
import { getRightClearance, watchObstacles } from './utils';

interface PopoverAvoidance {
	/** Room the obstacles take from the viewport's right edge; keep the popover left of it. */
	clearance: number;
}

/** Keeps a popover clear of `obstacles` while `enabled`; keep the array stable across renders. */
export function usePopoverAvoidance(
	obstacles: Obstacle[],
	enabled: boolean,
): PopoverAvoidance {
	const [clearance, setClearance] = useState(0);

	// Before paint, so the popover opens beside an obstacle instead of moving there.
	useLayoutEffect(() => {
		if (!enabled) {
			return undefined;
		}
		return watchObstacles(obstacles, (rects) =>
			setClearance(getRightClearance(rects)),
		);
	}, [enabled, obstacles]);

	return { clearance };
}
