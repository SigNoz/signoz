import { useCallback, useMemo, useState } from 'react';
// eslint-disable-next-line no-restricted-imports -- global time still lives in redux
import { useSelector } from 'react-redux';
import type {
	CustomTimeType,
	Time,
} from 'container/TopNav/DateTimeSelectionV2/types';
import GetMinMax from 'lib/getMinMax';
import {
	buildExtendWindow,
	ExtendTimeWindow,
} from 'pages/DashboardPageV2/DashboardContainer/Panels/components/NoData/extendWindow';
import { getNextZoomOutRange } from 'lib/zoomOutUtils';
import type { PanelQueryTimeOverride } from 'pages/DashboardPageV2/DashboardContainer/hooks/usePanelQuery';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';
import { NANO_SECOND_MULTIPLIER } from '@/store/globalTime';

export interface ViewPanelTimeWindow {
	/** Absolute window (epoch ms) to pass to usePanelQuery as a time override. */
	timeOverride: PanelQueryTimeOverride;
	/** Interval shown in the picker — a relative `Time` or `'custom'`. */
	selectedInterval: Time | CustomTimeType;
	/** Apply a selection from DateTimeSelectionV2 (modal mode). */
	onTimeChange: (
		interval: Time | CustomTimeType,
		range?: [number, number],
	) => void;
	/** Re-anchor a relative window to "now" (manual refresh); no-op for custom. */
	refreshWindow: () => void;
	/** Drag-to-zoom on a time chart → set a custom window locally (not the dashboard's). */
	onDragSelect: (start: number, end: number) => void;
	/** Widens this local window in place — powers the empty-state "extend" action. */
	extendWindow: ExtendTimeWindow;
}

/**
 * Per-view time window for the panel View modal, isolated from the dashboard's
 * global time (V1 parity: the modal's time selector doesn't move the grid). Seeded
 * once from the current global window, then owned locally. Relative intervals
 * resolve to an absolute ms window via the same `GetMinMax` the app-wide picker uses.
 */
export function useViewPanelTimeWindow(): ViewPanelTimeWindow {
	const { selectedTime, minTime, maxTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const [selectedInterval, setSelectedInterval] = useState<
		Time | CustomTimeType
	>(selectedTime as Time);
	const [timeOverride, setTimeOverride] = useState<PanelQueryTimeOverride>(
		() => ({
			startMs: Math.floor(minTime / NANO_SECOND_MULTIPLIER),
			endMs: Math.floor(maxTime / NANO_SECOND_MULTIPLIER),
		}),
	);

	const onTimeChange = useCallback(
		(interval: Time | CustomTimeType, range?: [number, number]): void => {
			setSelectedInterval(interval);
			// Absolute range comes through directly (already epoch ms).
			if (interval === 'custom' && range) {
				setTimeOverride({
					startMs: Math.floor(range[0]),
					endMs: Math.floor(range[1]),
				});
				return;
			}
			// GetMinMax returns nanoseconds — convert to the ms window we work in.
			const { minTime: startNs, maxTime: endNs } = GetMinMax(interval);
			setTimeOverride({
				startMs: Math.floor(startNs / NANO_SECOND_MULTIPLIER),
				endMs: Math.floor(endNs / NANO_SECOND_MULTIPLIER),
			});
		},
		[],
	);

	const refreshWindow = useCallback((): void => {
		// A custom window is fixed; only relative intervals re-anchor to now.
		if (selectedInterval === 'custom') {
			return;
		}
		const { minTime: startNs, maxTime: endNs } = GetMinMax(selectedInterval);
		setTimeOverride({
			startMs: Math.floor(startNs / NANO_SECOND_MULTIPLIER),
			endMs: Math.floor(endNs / NANO_SECOND_MULTIPLIER),
		});
	}, [selectedInterval]);

	const onDragSelect = useCallback((start: number, end: number): void => {
		// Drag values are already epoch ms (same as the global custom range).
		const startMs = Math.floor(start);
		const endMs = Math.floor(end);
		// Ignore a click / zero-width or inverted selection.
		if (startMs >= endMs) {
			return;
		}
		setSelectedInterval('custom');
		setTimeOverride({ startMs, endMs });
	}, []);

	// Empty-state extender that widens this local window via onTimeChange (not global time).
	const extendWindow = useMemo<ExtendTimeWindow>(() => {
		const result = getNextZoomOutRange(timeOverride.startMs, timeOverride.endMs);
		return buildExtendWindow(result, (): void => {
			if (!result) {
				return;
			}
			const [startMs, endMs] = result.range;
			if (result.preset) {
				onTimeChange(result.preset);
			} else {
				onTimeChange('custom', [startMs, endMs]);
			}
		});
	}, [timeOverride, onTimeChange]);

	return useMemo(
		() => ({
			timeOverride,
			selectedInterval,
			onTimeChange,
			refreshWindow,
			onDragSelect,
			extendWindow,
		}),
		[
			timeOverride,
			selectedInterval,
			onTimeChange,
			refreshWindow,
			onDragSelect,
			extendWindow,
		],
	);
}
