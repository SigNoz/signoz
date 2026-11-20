export const BOTTOM_STRIP_HEIGHT = 24;

export const BOTTOM_STRIP_MIN_HEIGHT = 0;
export const BOTTOM_STRIP_MAX_HEIGHT = 200;

// 48 is skipped: on a linear track its label would overlap 50's.
export const BOTTOM_STRIP_HEIGHT_MARKS: Record<number, string> =
	Object.fromEntries(
		[0, 8, 16, 24, 32, 40, 50, 100, 150, 200].map((px) => [px, String(px)]),
	);
