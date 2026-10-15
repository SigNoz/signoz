import type {
	DashboardtypesGeoMapChartAppearanceDTO,
	DashboardtypesGeoMapColorsDTO,
} from 'api/generated/services/sigNoz.schemas';
import type {
	GeoMapColorKey,
	GeoMapColors,
	GeoMapLayer,
} from 'lib/visualization/charts/GeoMap/types';
import {
	ColorRampMode,
	ColorRampPalette,
	ColorRampScale,
} from 'lib/visualization/colorRamp/types';
import type { PanelThreshold } from 'pages/DashboardPage/DashboardContainer/Panels/types/threshold';

import { formatPanelValue } from '../../utils/formatPanelValue';

const DEFAULT_STEPS = 64;

/** Points are many and small; bubbles are few and carry a size. */
const DEFAULT_RADIUS: Record<GeoMapLayer, [number, number]> = {
	regions: [3, 28],
	bubbles: [3, 28],
	points: [2, 8],
};

export function resolveColorScale(
	colors: DashboardtypesGeoMapColorsDTO | undefined,
): ColorRampScale {
	return (colors?.scale as ColorRampScale | undefined) ?? ColorRampScale.Log;
}

export function resolveColors(
	colors: DashboardtypesGeoMapColorsDTO | undefined,
): GeoMapColors {
	return {
		mode: (colors?.mode as ColorRampMode | undefined) ?? ColorRampMode.Palette,
		palette:
			(colors?.palette as ColorRampPalette | undefined) ?? ColorRampPalette.Lava,
		scale: resolveColorScale(colors),
		steps: colors?.steps || DEFAULT_STEPS,
		min: colors?.min ?? null,
		max: colors?.max ?? null,
		fill: colors?.fill ?? '',
	};
}

/** The spec's radius range over the layer default; a min above the max lifts the max. */
export function resolveBubbleRadius(
	bubbles: DashboardtypesGeoMapChartAppearanceDTO['bubbles'],
	layer: GeoMapLayer,
): [number, number] {
	const [defaultMin, defaultMax] = DEFAULT_RADIUS[layer];
	const min = bubbles?.minRadius ?? defaultMin;
	const max = bubbles?.maxRadius ?? defaultMax;
	return [min, Math.max(min, max)];
}

const OPERATOR_LABEL: Record<string, string> = {
	'>=': '≥',
	'<=': '≤',
	'!=': '≠',
};

/** One legend key per threshold, e.g. `> 5%`. */
export function toColorKeys(thresholds: PanelThreshold[]): GeoMapColorKey[] {
	return thresholds.map(({ operator = '>', value, unit, color }) => ({
		label: `${OPERATOR_LABEL[operator] ?? operator} ${formatPanelValue(value, unit)}`,
		color,
	}));
}
