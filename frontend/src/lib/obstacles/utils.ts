import type { Obstacle, Rect, Position } from './types';

const GAP = 8;
export const SLIDE_DURATION_MS = 200;

function overlaps(a: Rect, b: Rect): boolean {
	return (
		a.x < b.x + b.width &&
		b.x < a.x + a.width &&
		a.y < b.y + b.height &&
		b.y < a.y + a.height
	);
}

export function isAt(a: Position, b: Position): boolean {
	return Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1;
}

/** Slides the panel left past every obstacle it overlaps, `GAP` clear of each. */
export function getPositionClearOf(panel: Rect, obstacles: Rect[]): Position {
	let { x } = panel;
	// Moving only left, each obstacle is passed at most once.
	for (let i = 0; i < obstacles.length; i += 1) {
		const hit = obstacles.find((obstacle) => overlaps({ ...panel, x }, obstacle));
		if (!hit) {
			break;
		}
		x = hit.x - GAP - panel.width;
	}
	if (x === panel.x) {
		return { x, y: panel.y };
	}
	return { x: Math.max(GAP, x), y: panel.y };
}

/** Room to leave at the viewport's right edge for the obstacles, `GAP` included; 0 when none show. */
export function getRightClearance(obstacles: Rect[]): number {
	return obstacles.reduce(
		(clearance, obstacle) =>
			Math.max(clearance, window.innerWidth - obstacle.x + GAP),
		0,
	);
}

/** Calls `onChange` with the shown obstacles' boxes now and whenever one shows, hides or moves; returns the unsubscribe. */
export function watchObstacles(
	obstacles: Obstacle[],
	onChange: (rects: Rect[]) => void,
): () => void {
	const update = (): void =>
		onChange(
			obstacles
				.map((obstacle) => obstacle.getRect())
				.filter((rect): rect is Rect => rect !== null),
		);
	const unsubscribes = obstacles.map((obstacle) => obstacle.subscribe(update));
	update();
	return (): void => unsubscribes.forEach((unsubscribe) => unsubscribe());
}
