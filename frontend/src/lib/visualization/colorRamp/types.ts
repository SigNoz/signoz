export enum ColorRampScale {
	Log = 'log',
	Sqrt = 'sqrt',
	Linear = 'linear',
}

export enum ColorRampMode {
	Palette = 'palette',
	Opacity = 'opacity',
}

/** Sequential ramps only: colour means "how much", so a midpoint or hue cycle
 *  would read as a threshold that does not exist. */
export enum ColorRampPalette {
	Ice = 'ice',
	Moss = 'moss',
	Rust = 'rust',
	Graphite = 'graphite',
	Ember = 'ember',
	Lagoon = 'lagoon',
	Orchid = 'orchid',
	Verdant = 'verdant',
	Lava = 'lava',
	Beacon = 'beacon',
}

export interface ColorRampOptions {
	mode: ColorRampMode;
	scale: ColorRampScale;
	/** `null` derives it, which is always 0 — a value of 0 belongs at the bottom. */
	min: number | null;
	/** `null` derives it from the highest value. */
	max: number | null;
	palette: ColorRampPalette;
	/** Colour steps the ramp is quantised into, 2..128. Unrelated to `step`, the
	 *  column width in seconds. */
	steps: number;
	/** Opacity mode. Empty falls back to the caller's series colour. */
	fill: string;
}
