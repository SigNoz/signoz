import { asArray } from 'ol/color';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';

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
} {
	const shapes = new Map<string, Style>();
	const bubbles = new Map<string, Style>();
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
	};
}
