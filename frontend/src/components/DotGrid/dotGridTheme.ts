// Colours for the dot grid that depend on the page behind it.

export interface SnakeColors {
	head: string;
	body: string;
	food: string;
}

const DARK_SNAKE: SnakeColors = {
	head: 'rgba(255,255,255,1)',
	body: 'rgba(232,238,245,0.92)',
	food: 'rgba(255,255,255,0.97)',
};

function withAlpha(rgb: string, alpha: number): string {
	const channels = rgb.match(/\d+(\.\d+)?/g)?.slice(0, 3) ?? ['0', '0', '0'];
	return `rgba(${channels.join(',')},${alpha})`;
}

/** Snake colours: white on the dark page, the canvas's ink (`color`) on the light one. */
export function getSnakeColors(
	canvas: HTMLCanvasElement,
	isDarkMode: boolean,
): SnakeColors {
	if (isDarkMode) {
		return DARK_SNAKE;
	}
	const ink = getComputedStyle(canvas).color;
	return {
		head: withAlpha(ink, 1),
		body: withAlpha(ink, 0.85),
		food: withAlpha(ink, 0.95),
	};
}
