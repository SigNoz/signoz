import type { FloatingRect, Position } from './types';

const GAP = 8;

function overlaps(a: FloatingRect, b: FloatingRect): boolean {
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
export function getPositionClearOf(
	panel: FloatingRect,
	obstacles: FloatingRect[],
): Position {
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
