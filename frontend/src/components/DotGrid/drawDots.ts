// Painting for the dot grid: the aurora field with the cursor's glow, and plain dots.

import {
	auroraBrightness,
	auroraColor,
	DOT_RADIUS,
	TRAIL_LIFE_MS,
	TRAIL_LIFT,
	TRAIL_RADIUS,
} from './dotGridField';

// Coloured dots on white read fainter than lit ones on black.
const LIGHT_ALPHA_BOOST = 1.6;

export interface TrailPoint {
	x: number;
	y: number;
	born: number;
}

interface AuroraFrame {
	/** Field time; frozen when motion is reduced. */
	t: number;
	now: number;
	height: number;
	trail: TrailPoint[];
	isGameOn: boolean;
	/** Light adds up on the dark page; on the light one colours sit on the paper instead. */
	isDarkMode: boolean;
	/** Dots below this stay dark. */
	cutoffY: number;
}

/** The faint light that washes up from the bottom while the game is on. */
export function gameFloor(y: number, height: number): number {
	return 0.07 + 0.16 * (y / height);
}

export function drawDot(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	radius: number,
	fill: string,
): void {
	ctx.beginPath();
	ctx.fillStyle = fill;
	ctx.arc(x, y, radius, 0, Math.PI * 2);
	ctx.fill();
}

/** Paints the aurora dots, brightest at the top and lit along the cursor's trail. */
export function drawAuroraDots(
	ctx: CanvasRenderingContext2D,
	dots: { x: number; y: number }[],
	{ t, now, height, trail, isGameOn, isDarkMode, cutoffY }: AuroraFrame,
): void {
	// Overlapping glows add up, as light does.
	ctx.globalCompositeOperation = isDarkMode ? 'lighter' : 'source-over';
	dots.forEach(({ x, y }) => {
		if (y > cutoffY) {
			return;
		}
		// Brightest at the top, fading toward the content below.
		const topWeight = 1 - 0.82 * Math.min(1, y / height);
		const lum = Math.max(0, auroraBrightness(x, y, t)) ** 1.6;
		let intensity = (0.06 + lum * 0.4) * topWeight * (isGameOn ? 0.5 : 1);
		if (isGameOn) {
			intensity += gameFloor(y, height);
		}

		let glow = 0;
		trail.forEach((point) => {
			const distance2 = (x - point.x) ** 2 + (y - point.y) ** 2;
			if (distance2 < TRAIL_RADIUS ** 2) {
				const life = 1 - (now - point.born) / TRAIL_LIFE_MS;
				glow += (1 - distance2 / TRAIL_RADIUS ** 2) ** 3 * life;
			}
		});
		intensity += Math.min(glow, 1.3) * TRAIL_LIFT * topWeight;

		if (intensity <= 0.02) {
			return;
		}
		const [red, green, blue] = auroraColor(x, y, t);
		// The hottest dots burn toward white on the dark page and deepen on the light one.
		const heat = Math.min(1, Math.max(0, intensity - 0.9)) * 0.9;
		const toward = isDarkMode ? 255 : 0;
		const mix = isDarkMode ? heat : heat * 0.4;
		const rgb = `${Math.round(red + (toward - red) * mix)},${Math.round(
			green + (toward - green) * mix,
		)},${Math.round(blue + (toward - blue) * mix)}`;
		const alpha = Math.min(1, intensity * (isDarkMode ? 1 : LIGHT_ALPHA_BOOST));
		const radius = DOT_RADIUS + Math.min(intensity, 1.2) * 0.7;

		if (intensity > 0.6) {
			drawDot(ctx, x, y, radius * 2.6, `rgba(${rgb},${alpha * 0.06})`);
		}
		drawDot(ctx, x, y, radius, `rgba(${rgb},${alpha})`);
	});
	ctx.globalCompositeOperation = 'source-over';
}
