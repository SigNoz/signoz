import { useCallback, useMemo } from 'react';
import type { DashboardtypesPieChartPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';
import Pie from 'container/DashboardContainer/visualization/charts/Pie/Pie';
import type { PieSlice } from 'container/DashboardContainer/visualization/charts/types';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { prepareScalarTables } from 'pages/DashboardPageV2/DashboardContainer/queryV5/prepareScalarTables';
import { getScalarResults } from 'pages/DashboardPageV2/DashboardContainer/queryV5/v5ResponseData';

import NoData from '../../components/NoData/NoData';
import PanelStyles from '../../panel.module.scss';
import { PanelRendererProps } from '../../types/rendererProps';
import {
	resolveDecimalPrecision,
	resolveLegendPosition,
} from '../../utils/chartAppearance/resolvers';

import { preparePieData } from './prepareData';

function PiePanelRenderer({
	panelId,
	panel,
	data,
	refetch,
	onClick,
}: PanelRendererProps<'signoz/PieChartPanel'>): JSX.Element {
	const isDarkMode = useIsDarkMode();

	const spec = useMemo<DashboardtypesPieChartPanelSpecDTO>(
		() => panel.spec.plugin.spec,
		[panel.spec.plugin.spec],
	);

	const slices = useMemo(
		() =>
			preparePieData({
				tables: prepareScalarTables({
					results: getScalarResults(data.response),
					legendMap: data.legendMap ?? {},
					requestPayload: data.requestPayload,
				}),
				customColors: spec.legend?.customColors,
				isDarkMode,
			}),
		[
			data.response,
			data.legendMap,
			data.requestPayload,
			spec.legend?.customColors,
			isDarkMode,
		],
	);

	const decimalPrecision = useMemo(
		() => resolveDecimalPrecision(spec.formatting?.decimalPrecision),
		[spec.formatting?.decimalPrecision],
	);

	const legendPosition = useMemo(
		() => resolveLegendPosition(spec.legend?.position),
		[spec.legend?.position],
	);

	const handleSliceClick = useCallback(
		(slice: PieSlice) => {
			onClick?.({ label: slice.label, value: slice.value });
		},
		[onClick],
	);

	return (
		<div data-testid="pie-panel-renderer" className={PanelStyles.panelContainer}>
			{slices.length === 0 ? (
				<NoData onRetry={refetch} />
			) : (
				<Pie
					data={slices}
					yAxisUnit={spec.formatting?.unit}
					decimalPrecision={decimalPrecision}
					isDarkMode={isDarkMode}
					position={legendPosition}
					id={panelId}
					onSliceClick={handleSliceClick}
					data-testid="pie-chart"
				/>
			)}
		</div>
	);
}

export default PiePanelRenderer;
