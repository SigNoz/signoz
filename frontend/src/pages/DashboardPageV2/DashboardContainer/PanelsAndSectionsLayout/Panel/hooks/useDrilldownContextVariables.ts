import { useMemo } from 'react';
// eslint-disable-next-line no-restricted-imports -- context links resolve global-time variables off redux (V1 parity)
import { useSelector } from 'react-redux';
import type { DrilldownContext } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/drilldown';
import { useDashboardStore } from 'pages/DashboardPageV2/DashboardContainer/store/useDashboardStore';
import type { AppState } from 'store/reducers';
import type { GlobalReducer } from 'types/reducer/globalTime';

/**
 * Builds the variable map that resolves context-link templates, mirroring V1's `useContextVariables`
 * but sourced from V2 state: dashboard variable selections (by name), the global time window
 * (`timestamp_start`/`timestamp_end`, ms), and the clicked point's field values (`_`-prefixed, the
 * V1 convention that keeps them from clashing with dashboard variable names).
 */
export function useDrilldownContextVariables(
	context: DrilldownContext | null,
): Record<string, string> {
	// dashboardId from the store's edit context (set once by DashboardContainer), the same
	// source the rest of V2 uses — not react-router params.
	const dashboardId = useDashboardStore((state) => state.dashboardId);
	// Select the stable top-level map (not `state.variableValues[id] ?? {}`, whose fresh `{}` each
	// render makes useSyncExternalStore loop); index by dashboard inside the memo.
	const variableValuesByDashboard = useDashboardStore(
		(state) => state.variableValues,
	);
	const globalTime = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	return useMemo(() => {
		const result: Record<string, string> = {};

		const variableValues = variableValuesByDashboard[dashboardId] ?? {};
		Object.entries(variableValues).forEach(([name, selection]) => {
			const { value } = selection;
			if (value == null) {
				return;
			}
			result[name] = Array.isArray(value) ? value.join(', ') : String(value);
		});

		// Global time window, ns → ms (V1 parity).
		result.timestamp_start = String(Math.floor(globalTime.minTime / 1e6));
		result.timestamp_end = String(Math.floor(globalTime.maxTime / 1e6));

		context?.filters.forEach(({ filterKey, filterValue }) => {
			result[`_${filterKey}`] = String(filterValue);
		});

		return result;
	}, [
		variableValuesByDashboard,
		dashboardId,
		globalTime.minTime,
		globalTime.maxTime,
		context,
	]);
}
