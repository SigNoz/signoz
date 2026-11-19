import { RefObject, useEffect } from 'react';
import type { Rnd } from 'react-rnd';

import type { Obstacle, Rect, Position } from 'lib/obstacles/types';
import {
	getPositionClearOf,
	isAt,
	SLIDE_DURATION_MS,
	watchObstacles,
} from 'lib/obstacles/utils';

const SLIDING_CLASS = 'floating-panel--sliding';

/**
 * Slides the panel clear of `obstacles` while they show, and back once they
 * hide unless the user has moved it since.
 */
export function useAvoidObstacles(
	rndRef: RefObject<Rnd>,
	obstacles: Obstacle[] | undefined,
	enabled: boolean,
): void {
	useEffect(() => {
		if (!enabled || !obstacles?.length) {
			return undefined;
		}

		// Where the user left the panel, and where it was slid to from there.
		let home: Position | null = null;
		let placed: Position | null = null;
		let slideTimer: number | undefined;

		const update = (rects: Rect[]): void => {
			const rnd = rndRef.current;
			const element = rnd?.getSelfElement();
			if (!rnd || !element) {
				return;
			}
			const position = rnd.getDraggablePosition();
			if (placed && !isAt(position, placed)) {
				home = null;
			}
			const base = home ?? position;
			const target = getPositionClearOf(
				{ ...base, width: element.offsetWidth, height: element.offsetHeight },
				rects,
			);
			if (!isAt(position, target)) {
				element.classList.add(SLIDING_CLASS);
				rnd.updatePosition(target);
				window.clearTimeout(slideTimer);
				slideTimer = window.setTimeout(
					() => element.classList.remove(SLIDING_CLASS),
					SLIDE_DURATION_MS,
				);
			}
			const slid = !isAt(base, target);
			home = slid ? base : null;
			placed = slid ? target : null;
		};

		return watchObstacles(obstacles, update);
	}, [enabled, obstacles, rndRef]);
}
