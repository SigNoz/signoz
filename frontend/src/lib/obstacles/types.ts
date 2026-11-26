export interface Position {
	x: number;
	y: number;
}

export interface Rect extends Position {
	width: number;
	height: number;
}

/** Something on screen that panels and popovers slide out of the way of. */
export interface Obstacle {
	/** Viewport box while on screen, null otherwise. */
	getRect: () => Rect | null;
	/** Calls `onChange` whenever the box shows, hides or moves; returns the unsubscribe. */
	subscribe: (onChange: () => void) => () => void;
}
