import type uPlot from 'uplot';

export interface BarRect {
	left: number;
	top: number;
	width: number;
	height: number;
}

let onBarRect: ((rect: BarRect) => void) | null = null;

/** `each` callback for bar path builders; reports bar rects while {@link measureBar} runs. */
// eslint-disable-next-line max-params
export function reportBarRect(
	_u: uPlot,
	_seriesIdx: number,
	_idx: number,
	left: number,
	top: number,
	width: number,
	height: number,
): void {
	onBarRect?.({ left, top, width, height });
}

/**
 * Canvas rect of one bar, from re-running the series' paths for that index.
 * `null` for series not drawn as bars.
 */
export function measureBar(
	u: uPlot,
	seriesIdx: number,
	idx: number,
): BarRect | null {
	let rect: BarRect | null = null;
	onBarRect = (measured): void => {
		rect = measured;
	};
	try {
		u.series[seriesIdx].paths?.(u, seriesIdx, idx, idx);
	} finally {
		onBarRect = null;
	}
	return rect;
}
