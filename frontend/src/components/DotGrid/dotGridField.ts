export const DOT_SPACING = 12;
export const DOT_RADIUS = 1.15;

export const TRAIL_RADIUS = 72;
export const TRAIL_LIFT = 0.24;
export const TRAIL_MAX_POINTS = 18;
export const TRAIL_LIFE_MS = 1000;
export const TRAIL_MIN_STEP = 7;

// Time the field rests at when motion is reduced.
export const STILL_TIME_MS = 12000;

type Rgb = [number, number, number];

// Green, teal, blue, violet and pink, in the order the field drifts through them.
const AURORA: Rgb[] = [
	[64, 224, 150],
	[48, 200, 210],
	[90, 130, 245],
	[170, 110, 245],
	[235, 110, 200],
];

/** Brightness of the field at a point, between -1 and 1. */
export function auroraBrightness(x: number, y: number, t: number): number {
	return (
		(Math.sin(x * 0.009 + t * 0.0006) +
			Math.sin(y * 0.015 - t * 0.00085 + x * 0.002) +
			Math.sin((x + y) * 0.006 + t * 0.0011) +
			Math.sin((x - y) * 0.0048 - t * 0.0007)) /
		4
	);
}

/** Colour of the field at a point, blended along the aurora palette. */
export function auroraColor(x: number, y: number, t: number): Rgb {
	const position =
		((Math.sin(x * 0.0035 + t * 0.00018) +
			Math.sin(y * 0.005 - t * 0.00026) +
			Math.sin((x + y) * 0.0028 + t * 0.0002)) /
			3 +
			1) /
		2;
	const scaled = position * (AURORA.length - 1);
	const from = AURORA[Math.floor(scaled)];
	const to = AURORA[Math.min(Math.floor(scaled) + 1, AURORA.length - 1)];
	const mix = scaled - Math.floor(scaled);
	return [
		from[0] + (to[0] - from[0]) * mix,
		from[1] + (to[1] - from[1]) * mix,
		from[2] + (to[2] - from[2]) * mix,
	];
}
