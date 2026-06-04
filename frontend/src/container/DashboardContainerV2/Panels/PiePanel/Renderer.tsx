import { useCallback, useMemo } from 'react';
import type { DashboardtypesPieChartPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';
import Pie from 'container/DashboardContainer/visualization/charts/Pie/Pie';
import type { PieSlice } from 'container/DashboardContainer/visualization/charts/types';
import { useIsDarkMode } from 'hooks/useDarkMode';

import PanelStyles from '../styles/panel.module.scss';
import { PanelRendererProps } from '../types';
import { resolveDecimalPrecision } from '../utils/chartAppearanceMappings';

import { preparePieData } from './data';

function PiePanelRenderer({
	panel,
	data,
	onClick,
}: PanelRendererProps<'signoz/PieChartPanel'>): JSX.Element {
	const isDarkMode = useIsDarkMode();

	// The registry guarantees this Renderer only runs when
	// `panel.spec.plugin.kind === 'signoz/PieChartPanel'`, so the cast is a
	// documented boundary narrowing. Memoized so the `?? {}` fallback doesn't
	// produce a fresh object on each render.
	const spec = useMemo<DashboardtypesPieChartPanelSpecDTO>(
		() => (panel?.spec?.plugin?.spec ?? {}) as DashboardtypesPieChartPanelSpecDTO,
		[panel?.spec?.plugin?.spec],
	);

	const slices = useMemo(
		() =>
			preparePieData({
				payload: data?.payload,
				customColors: spec.legend?.customColors,
				isDarkMode,
			}),
		[data?.payload, spec.legend?.customColors, isDarkMode],
	);

	const decimalPrecision = useMemo(
		() => resolveDecimalPrecision(spec.formatting?.decimalPrecision),
		[spec.formatting?.decimalPrecision],
	);

	const handleSliceClick = useCallback(
		(slice: PieSlice) => {
			onClick?.({ label: slice.label, value: slice.value });
		},
		[onClick],
	);

	return (
		<div data-testid="pie-panel-renderer" className={PanelStyles.panelContainer}>
			<Pie
				data={slices}
				yAxisUnit={spec.formatting?.unit}
				decimalPrecision={decimalPrecision}
				isDarkMode={isDarkMode}
				onSliceClick={handleSliceClick}
				data-testid="pie-chart"
			/>
		</div>
	);
}

export default PiePanelRenderer;
