import type {
	DashboardtypesPanelFormattingDTO,
	DashboardtypesThresholdWithLabelDTO,
} from 'api/generated/services/sigNoz.schemas';
import { Timezone } from 'components/CustomTimePicker/timezoneUtils';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { PanelMode } from 'container/DashboardContainer/visualization/panels/types';
import onClickPlugin, {
	OnClickPluginOpts,
} from 'lib/uPlotLib/plugins/onClickPlugin';
import { DistributionType } from 'lib/uPlotV2/config/types';
import { UPlotConfigBuilder } from 'lib/uPlotV2/config/UPlotConfigBuilder';
import { ThresholdsDrawHookOptions } from 'lib/uPlotV2/hooks/types';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import uPlot from 'uplot';

import {
	resolveSelectionPreferencesSource,
	shouldSaveSelectionPreference,
} from './selectionPreferences';

/**
 * Inputs for the shared V2 chart pipeline. Accepts perses-shaped inputs directly
 * so callers don't translate per panel. Wires only the scaffolding (scales,
 * thresholds, axes, drag-to-zoom, click plugin); series rendering is per-panel.
 */
export interface BuildBaseConfigArgs {
	panelId: string;
	panelType: PANEL_TYPES;
	isDarkMode: boolean;
	timezone: Timezone;
	panelMode: PanelMode;

	/** From `spec.axes` — drives the Y scale and (when log) both scales' base. */
	isLogScale?: boolean;
	softMin?: number;
	softMax?: number;

	/** From `spec.formatting.unit` — drives Y axis tick formatting + threshold formatting. */
	formatting?: DashboardtypesPanelFormattingDTO;

	/** From `spec.thresholds` — perses shape, mapped to the draw-hook shape internally. */
	thresholds?: DashboardtypesThresholdWithLabelDTO[] | null;

	/** Per-query step intervals from the response exec stats. */
	stepIntervals?: Record<string, number>;
	/** Payload for the shared click plugin; omitted by panels without click interactions. */
	clickPayload?: MetricRangePayloadProps;

	/** Time-range clamps for the X scale (typically from `getTimeRange(apiResponse)`). */
	minTimeScale?: number;
	maxTimeScale?: number;

	/** Optional — histogram and other non-time panels omit drag-to-zoom. */
	onDragSelect?: (start: number, end: number) => void;
	onClick?: OnClickPluginOpts['onClick'];
}

/**
 * Builds the panel-agnostic scaffolding of a uPlot chart (scales, thresholds,
 * axes, drag-to-zoom, click plugin). Callers then `addSeries`/`addPlugin` on the
 * returned builder for their own rendering.
 */
export function buildBaseConfig({
	panelId,
	panelType,
	isDarkMode,
	timezone,
	panelMode,
	isLogScale,
	softMin,
	softMax,
	formatting,
	thresholds,
	stepIntervals,
	clickPayload,
	minTimeScale,
	maxTimeScale,
	onDragSelect,
	onClick,
}: BuildBaseConfigArgs): UPlotConfigBuilder {
	const yAxisUnit = formatting?.unit;

	const builder = new UPlotConfigBuilder({
		id: panelId,
		onDragSelect,
		tzDate: makeTzDate(timezone),
		shouldSaveSelectionPreference: shouldSaveSelectionPreference(panelMode),
		selectionPreferencesSource: resolveSelectionPreferencesSource(panelMode),
		stepInterval: stepIntervals ? minStepInterval(stepIntervals) : undefined,
	});

	const thresholdOptions: ThresholdsDrawHookOptions = {
		scaleKey: 'y',
		thresholds: mapThresholds(thresholds),
		yAxisUnit,
	};

	builder.addThresholds(thresholdOptions);

	builder.addScale({
		scaleKey: 'x',
		time: true,
		min: minTimeScale,
		max: maxTimeScale,
		logBase: isLogScale ? 10 : undefined,
		distribution: isLogScale
			? DistributionType.Logarithmic
			: DistributionType.Linear,
	});

	builder.addScale({
		scaleKey: 'y',
		time: false,
		min: undefined,
		max: undefined,
		softMin,
		softMax,
		thresholds: thresholdOptions,
		logBase: isLogScale ? 10 : undefined,
		distribution: isLogScale
			? DistributionType.Logarithmic
			: DistributionType.Linear,
	});

	if (typeof onClick === 'function') {
		builder.addPlugin(onClickPlugin({ onClick, apiResponse: clickPayload }));
	}

	builder.addAxis({
		scaleKey: 'x',
		show: true,
		side: 2,
		isDarkMode,
		isLogScale,
		panelType,
	});

	builder.addAxis({
		scaleKey: 'y',
		show: true,
		side: 3,
		isDarkMode,
		isLogScale,
		yAxisUnit,
		panelType,
	});

	return builder;
}

function makeTzDate(
	timezone: Timezone,
): ((timestamp: number) => Date) | undefined {
	if (!timezone) {
		return undefined;
	}
	return (timestamp: number): Date =>
		uPlot.tzDate(new Date(timestamp * 1e3), timezone.value);
}

/**
 * Perses-shape thresholds → the draw-hook shape uPlotV2 consumes. Exported so
 * panels feeding the same list elsewhere don't redo the mapping.
 */
export function mapThresholds(
	thresholds: DashboardtypesThresholdWithLabelDTO[] | null | undefined,
): ThresholdsDrawHookOptions['thresholds'] {
	if (!thresholds || thresholds.length === 0) {
		return [];
	}
	return thresholds.map((t) => ({
		thresholdValue: t.value,
		thresholdColor: t.color,
		thresholdUnit: t.unit,
		thresholdLabel: t.label,
	}));
}

/**
 * Smallest per-query step interval, fed to uPlot so tick density matches the
 * densest query. Falls back to `undefined` (uPlot "auto") on an empty map, since
 * `Math.min` returns `Infinity` there and would corrupt scale math.
 */
function minStepInterval(
	stepIntervals: Record<string, number>,
): number | undefined {
	const values = Object.values(stepIntervals);
	if (values.length === 0) {
		return undefined;
	}
	const min = Math.min(...values);
	return Number.isFinite(min) ? min : undefined;
}
