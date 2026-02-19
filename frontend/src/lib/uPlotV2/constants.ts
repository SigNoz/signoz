import { Cursor, Options } from 'uplot';

const POINTS_FILL_COLOR = '#FFFFFF';

export const DEFAULT_HOVER_PROXIMITY_VALUE = 30; // only snap if within 30px horizontally
export const DEFAULT_FOCUS_PROXIMITY_VALUE = 1e6;
export const STEP_INTERVAL_MULTIPLIER = 3; // multiply the width computed by STEP_INTERVAL_MULTIPLIER to get the hover prox value

export const DEFAULT_PLOT_CONFIG: Partial<Options> = {
	focus: {
		alpha: 0.3,
	},
	legend: {
		show: false,
	},
	padding: [16, 16, 8, 8],
	series: [],
	hooks: {},
};

export const DEFAULT_CURSOR_CONFIG: Cursor = {
	drag: { setScale: true },
	points: {
		one: true,
		size: (u, seriesIdx) => (u.series[seriesIdx]?.points?.size ?? 0) * 3,
		width: (_u, _seriesIdx, size) => size / 4,
		stroke: (u, seriesIdx): string => {
			const points = u.series[seriesIdx]?.points;
			const strokeFn =
				typeof points?.stroke === 'function' ? points.stroke : undefined;
			const strokeValue =
				strokeFn !== undefined
					? strokeFn(u, seriesIdx)
					: typeof points?.stroke === 'string'
					? points.stroke
					: '';
			return `${strokeValue}90`;
		},
		fill: (): string => POINTS_FILL_COLOR,
	},
	focus: {
		prox: DEFAULT_FOCUS_PROXIMITY_VALUE,
	},
	hover: {
		prox: DEFAULT_HOVER_PROXIMITY_VALUE,
		bias: 0,
	},
};
