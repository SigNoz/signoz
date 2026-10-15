import { asArray } from 'ol/color';
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from 'ol/style';

import { LABEL_FONT } from './olLabels';

export interface OlPalette {
	noData: string;
	context: string;
	border: string;
	outline: string;
	bubbleStroke: string;
}

/** Canvas can't read CSS variables, so the theme's colours are resolved once. */
export function readPalette(element: HTMLElement): OlPalette {
	const styles = getComputedStyle(element);
	const read = (name: string): string => styles.getPropertyValue(name).trim();
	return {
		noData: read('--geo-no-data'),
		context: read('--geo-context'),
		border: read('--geo-border'),
		outline: read('--l1-foreground'),
		bubbleStroke: read('--l1-background'),
	};
}

function withAlpha(color: string, alpha: number): number[] {
	const [r, g, b] = asArray(color);
	return [r, g, b, alpha];
}

export function createStyleCache(): {
	shape: (fill: string, palette: OlPalette) => Style;
	bubble: (fill: string, radius: number, palette: OlPalette) => Style;
	/** A size-only bubble over shaded shapes: no ramp colour, so colour keeps one meaning. */
	neutralBubble: (radius: number, palette: OlPalette) => Style;
	/**
	 * A shape's name, haloed in the background colour so it reads on any fill.
	 * Labels declutter in draw order, so `priority` (larger wins) draws first.
	 */
	label: (text: string, priority: number, palette: OlPalette) => Style;
} {
	const shapes = new Map<string, Style>();
	const bubbles = new Map<string, Style>();
	const neutralBubbles = new Map<string, Style>();
	const labels = new Map<string, Style>();
	return {
		shape: (fill, palette): Style => {
			let style = shapes.get(fill);
			if (!style) {
				style = new Style({
					fill: new Fill({ color: fill }),
					stroke: new Stroke({ color: palette.border, width: 0.5 }),
				});
				shapes.set(fill, style);
			}
			return style;
		},
		bubble: (fill, radius, palette): Style => {
			const key = `${fill}:${radius.toFixed(1)}`;
			let style = bubbles.get(key);
			if (!style) {
				style = new Style({
					image: new CircleStyle({
						radius,
						fill: new Fill({ color: withAlpha(fill, 0.8) }),
						stroke: new Stroke({ color: palette.bubbleStroke, width: 1 }),
					}),
					zIndex: -radius,
				});
				bubbles.set(key, style);
			}
			return style;
		},
		neutralBubble: (radius, palette): Style => {
			const key = radius.toFixed(1);
			let style = neutralBubbles.get(key);
			if (!style) {
				style = new Style({
					image: new CircleStyle({
						radius,
						fill: new Fill({ color: withAlpha(palette.outline, 0.2) }),
						stroke: new Stroke({ color: palette.outline, width: 1.5 }),
					}),
					zIndex: -radius,
				});
				neutralBubbles.set(key, style);
			}
			return style;
		},
		label: (text, priority, palette): Style => {
			const key = `${text}:${priority}`;
			let style = labels.get(key);
			if (!style) {
				style = new Style({
					text: new Text({
						text,
						font: LABEL_FONT,
						fill: new Fill({ color: palette.outline }),
						stroke: new Stroke({ color: palette.bubbleStroke, width: 3 }),
					}),
					zIndex: -priority,
				});
				labels.set(key, style);
			}
			return style;
		},
	};
}
