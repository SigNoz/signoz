import { useMemo } from 'react';
import { useIsDarkMode } from 'hooks/useDarkMode';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import type { LegendSeries } from 'pages/DashboardPage/DashboardContainer/Panels/utils/legendSeries';
import { getSectionControls } from 'pages/DashboardPage/DashboardContainer/Panels/utils/getSectionControls';
import { SectionKind } from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';
import type { PanelQueryData } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

/**
 * Resolves the panel's rendered series into `{ label, defaultColor }` pairs so the
 * legend-colors control can key overrides by the exact labels the chart draws, using
 * the resolver the kind declares as its `colors` control.
 */
export function useLegendSeries(
	panel: DashboardtypesPanelDTO,
	data: PanelQueryData,
): LegendSeries[] {
	const isDarkMode = useIsDarkMode();
	const kind = panel.spec.plugin.kind;

	return useMemo(() => {
		const resolve = getSectionControls(kind, SectionKind.Legend)?.colors;
		return resolve
			? resolve({ queries: panel.spec.queries, data, isDarkMode })
			: [];
	}, [kind, panel.spec.queries, data, isDarkMode]);
}
