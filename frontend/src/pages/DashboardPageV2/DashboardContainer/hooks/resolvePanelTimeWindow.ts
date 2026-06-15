import { DashboardtypesTimePreferenceDTO } from 'api/generated/services/sigNoz.schemas';

/** Absolute time window in epoch milliseconds — the V5 request's native unit. */
export interface PanelTimeWindow {
	startMs: number;
	endMs: number;
}

/**
 * Span of each relative time preference, in milliseconds. `global_time` is absent: it
 * means "follow the dashboard window" and is handled as the default branch below.
 * Mirrors V1's `getStartAndEndTime` preset durations (last_1_month = 30 days).
 */
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

interface ResolvePanelTimeWindowArgs {
	/** The panel's saved per-panel time preference (`visualization.timePreference`). */
	timePreference: DashboardtypesTimePreferenceDTO | undefined;
	/** Dashboard global window (epoch ms) — used as-is for `global_time`. */
	globalStartMs: number;
	globalEndMs: number;
	/**
	 * Explicit caller window (epoch ms), e.g. the editor preview. When present it wins
	 * outright: the preview owns its own time selection and ignores the panel preference.
	 */
	override?: PanelTimeWindow;
}

/**
 * Resolves the absolute `[startMs, endMs]` window a panel should query over.
 *
 * Precedence: explicit `override` → relative `timePreference` preset → dashboard global
 * window. A relative preset is anchored to the dashboard's current end (`globalEndMs`)
 * rather than wall-clock `Date.now()`, so the window only changes when the dashboard
 * refreshes — this keeps it stable across renders (no react-query refetch loop) and in
 * step with the dashboard's refresh cadence. All values are floored: V5 start/end are
 * int64 on the wire and upstream ms can carry a fraction.
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
