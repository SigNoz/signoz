import { DashboardtypesTimePreferenceDTO } from 'api/generated/services/sigNoz.schemas';

/** Absolute time window in epoch milliseconds — the V5 request's native unit. */
export interface PanelTimeWindow {
	startMs: number;
	endMs: number;
}

// Span per relative preference, in ms. `global_time` is absent (follow the dashboard
// window, default branch below). Mirrors V1's `getStartAndEndTime` (last_1_month = 30 days).
const MINUTE_MS = 60 * 1000;
const PRESET_SPAN_MS: Partial<Record<DashboardtypesTimePreferenceDTO, number>> =
	{
		[DashboardtypesTimePreferenceDTO.last_5_min]: 5 * MINUTE_MS,
		[DashboardtypesTimePreferenceDTO.last_15_min]: 15 * MINUTE_MS,
		[DashboardtypesTimePreferenceDTO.last_30_min]: 30 * MINUTE_MS,
		[DashboardtypesTimePreferenceDTO.last_1_hr]: 60 * MINUTE_MS,
		[DashboardtypesTimePreferenceDTO.last_6_hr]: 6 * 60 * MINUTE_MS,
		[DashboardtypesTimePreferenceDTO.last_1_day]: 24 * 60 * MINUTE_MS,
		[DashboardtypesTimePreferenceDTO.last_3_days]: 3 * 24 * 60 * MINUTE_MS,
		[DashboardtypesTimePreferenceDTO.last_1_week]: 7 * 24 * 60 * MINUTE_MS,
		[DashboardtypesTimePreferenceDTO.last_1_month]: 30 * 24 * 60 * MINUTE_MS,
	};

// Short + full labels per relative preference, for the header time pill. `global_time` is
// absent — a panel that follows the dashboard window shows no pill.
const TIME_PREFERENCE_LABEL: Partial<
	Record<DashboardtypesTimePreferenceDTO, { short: string; full: string }>
> = {
	[DashboardtypesTimePreferenceDTO.last_5_min]: {
		short: '5m',
		full: 'Last 5 min',
	},
	[DashboardtypesTimePreferenceDTO.last_15_min]: {
		short: '15m',
		full: 'Last 15 min',
	},
	[DashboardtypesTimePreferenceDTO.last_30_min]: {
		short: '30m',
		full: 'Last 30 min',
	},
	[DashboardtypesTimePreferenceDTO.last_1_hr]: {
		short: '1h',
		full: 'Last 1 hr',
	},
	[DashboardtypesTimePreferenceDTO.last_6_hr]: {
		short: '6h',
		full: 'Last 6 hr',
	},
	[DashboardtypesTimePreferenceDTO.last_1_day]: {
		short: '1d',
		full: 'Last 1 day',
	},
	[DashboardtypesTimePreferenceDTO.last_3_days]: {
		short: '3d',
		full: 'Last 3 days',
	},
	[DashboardtypesTimePreferenceDTO.last_1_week]: {
		short: '1w',
		full: 'Last 1 week',
	},
	[DashboardtypesTimePreferenceDTO.last_1_month]: {
		short: '1mo',
		full: 'Last 1 month',
	},
};

export interface PanelTimePreferenceLabel {
	/** Compact pill label, e.g. `6h`. */
	short: string;
	/** Full label for the pill's tooltip, e.g. `Last 6 hr`. */
	full: string;
}

/** Pill labels for a panel's relative time preference, or `null` when it follows the dashboard window (`global_time`/unset). */
export function panelTimePreferenceLabel(
	timePreference: DashboardtypesTimePreferenceDTO | undefined,
): PanelTimePreferenceLabel | null {
	if (
		!timePreference ||
		timePreference === DashboardtypesTimePreferenceDTO.global_time
	) {
		return null;
	}
	return TIME_PREFERENCE_LABEL[timePreference] ?? null;
}

interface ResolvePanelTimeWindowArgs {
	/** The panel's saved per-panel time preference (`visualization.timePreference`). */
	timePreference: DashboardtypesTimePreferenceDTO | undefined;
	/** Dashboard global window (epoch ms) — used as-is for `global_time`. */
	globalStartMs: number;
	globalEndMs: number;
	/** Explicit caller window (epoch ms), e.g. the editor preview. When present it wins outright over the panel preference. */
	override?: PanelTimeWindow;
}

/**
 * Resolves the absolute `[startMs, endMs]` window a panel queries over.
 *
 * Precedence: `override` → relative `timePreference` preset → dashboard global window. A
 * preset is anchored to `globalEndMs`, not wall-clock `Date.now()`, so the window is stable
 * across renders (no refetch loop) and tracks the dashboard's refresh. All values floored:
 * V5 start/end are int64 on the wire and upstream ms can carry a fraction.
 */
export function resolvePanelTimeWindow({
	timePreference,
	globalStartMs,
	globalEndMs,
	override,
}: ResolvePanelTimeWindowArgs): PanelTimeWindow {
	if (override) {
		return {
			startMs: Math.floor(override.startMs),
			endMs: Math.floor(override.endMs),
		};
	}

	const endMs = Math.floor(globalEndMs);
	const spanMs =
		timePreference &&
		timePreference !== DashboardtypesTimePreferenceDTO.global_time
			? PRESET_SPAN_MS[timePreference]
			: undefined;

	if (spanMs !== undefined) {
		return { startMs: endMs - spanMs, endMs };
	}

	return { startMs: Math.floor(globalStartMs), endMs };
}
