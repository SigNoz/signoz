import { useCallback, useMemo, useState } from 'react';
// eslint-disable-next-line no-restricted-imports -- seed initial time from global store; never written back
import { useSelector } from 'react-redux';
import type {
	DashboardtypesPanelDTO,
	DashboardtypesTimePreferenceDTO,
} from 'api/generated/services/sigNoz.schemas';
import type {
	CustomTimeType,
	Time,
} from 'container/TopNav/DateTimeSelectionV2/types';
import GetMinMax from 'lib/getMinMax';
import { resolvePanelTimeWindow } from 'pages/DashboardPageV2/DashboardContainer/hooks/resolvePanelTimeWindow';
import {
	type UsePanelQueryResult,
	usePanelQuery,
} from 'pages/DashboardPageV2/DashboardContainer/hooks/usePanelQuery';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

const NS_TO_MS = 1e6;

/** Editor-local time window in epoch milliseconds — what `DateTimeSelectionV2` seeds from. */
export interface PreviewTimeRange {
	startMs: number;
	endMs: number;
}

interface UsePreviewQueryArgs {
	panel: DashboardtypesPanelDTO;
	panelId: string;
	enabled: boolean;
}

export interface UsePreviewQueryResult extends UsePanelQueryResult {
	/** Current relative interval (or `custom`) shown in the modal time picker. */
	selectedInterval: Time;
	/** Editor-local window (epoch ms); seeds the picker's custom range + duration pill. */
	timeRange: PreviewTimeRange;
	/** `DateTimeSelectionV2` modal callback: relative interval, or `custom` + [startMs, endMs]. */
	onTimeChange: (
		interval: Time | CustomTimeType,
		dateTimeRange?: [number, number],
	) => void;
}

/**
 * Owns the panel editor's preview query and its editor-local time selection. Lifted out
 * of `PreviewPane` so the editor root can share the single query result between the
 * preview and the config pane (e.g. the legend-colors control needs the resolved series).
 *
 * Time is driven by `DateTimeSelectionV2` in modal mode (`isModalTimeSelection` +
 * `disableUrlSync`), so the picker never reads or writes global Redux time or the URL —
 * its selections arrive through `onTimeChange` and stay in local state. The selection is
 * seeded once from the current global window so the preview opens matching the dashboard,
 * then resolved to an absolute `[startMs, endMs]` handed to `usePanelQuery`. The panel's
 * own time preference is folded in so editing it updates the preview live.
 */
export function usePreviewQuery({
	panel,
	panelId,
	enabled,
}: UsePreviewQueryArgs): UsePreviewQueryResult {
	const globalTime = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const [selectedInterval, setSelectedInterval] = useState<Time>(
		globalTime.selectedTime as Time,
	);
	const [timeRange, setTimeRange] = useState<PreviewTimeRange>(() => ({
		startMs: Math.floor(globalTime.minTime / NS_TO_MS),
		endMs: Math.floor(globalTime.maxTime / NS_TO_MS),
	}));

	const onTimeChange = useCallback(
		(interval: Time | CustomTimeType, dateTimeRange?: [number, number]): void => {
			setSelectedInterval(interval as Time);
			if (interval === 'custom' && dateTimeRange) {
				// DateTimeSelectionV2 emits custom ranges in epoch ms.
				setTimeRange({
					startMs: Math.floor(dateTimeRange[0]),
					endMs: Math.floor(dateTimeRange[1]),
				});
				return;
			}
			// GetMinMax resolves a relative interval to a now-anchored window in ns.
			const { minTime, maxTime } = GetMinMax(interval);
			setTimeRange({
				startMs: Math.floor(minTime / NS_TO_MS),
				endMs: Math.floor(maxTime / NS_TO_MS),
			});
		},
		[],
	);

	// The panel's saved time preference must drive the preview too, so editing it shows
	// the effect live. `visualization` is common to every plugin-spec variant — localized
	// cast reads it without narrowing on kind. A relative preset shrinks the picked window
	// to that span; global_time/none leaves it untouched.
	const timePreference = (
		panel?.spec?.plugin?.spec as
			| { visualization?: { timePreference?: DashboardtypesTimePreferenceDTO } }
			| undefined
	)?.visualization?.timePreference;

	const time = useMemo(
		() =>
			resolvePanelTimeWindow({
				timePreference,
				globalStartMs: timeRange.startMs,
				globalEndMs: timeRange.endMs,
			}),
		[timeRange, timePreference],
	);

	const result = usePanelQuery({ panel, panelId, enabled, time });

	return { ...result, selectedInterval, timeRange, onTimeChange };
}
