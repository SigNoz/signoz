export interface Position {
	x: number;
	y: number;
}

export interface FloatingRect extends Position {
	width: number;
	height: number;
}

/** Something on screen the panel slides out of the way of. */
export interface FloatingObstacle {
	/** Viewport box while on screen, null otherwise. */
	getRect: () => FloatingRect | null;
	/** Calls `onChange` whenever the box shows, hides or moves; returns the unsubscribe. */
	subscribe: (onChange: () => void) => () => void;
}
