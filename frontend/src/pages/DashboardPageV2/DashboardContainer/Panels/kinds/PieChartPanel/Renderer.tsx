import {
	useCallback,
	useMemo,
	type MouseEvent as ReactMouseEvent,
} from 'react';
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
import { enrichPieClick } from '../../utils/drilldown/enrichPieClick';
import { getBuilderQueries } from '../../utils/getBuilderQueries';
import { getPanelTimeRange } from '../../utils/getPanelTimeRange';

import { preparePieData } from './prepareData';

function PiePanelRenderer({
	panelId,
	panel,
	data,
	isFetching,
	refetch,
	onClick,
	enableDrillDown,
}: PanelRendererProps<'signoz/PieChartPanel'>): JSX.Element {
	const isDarkMode = useIsDarkMode();

	const spec = useMemo<DashboardtypesPieChartPanelSpecDTO>(
		() => panel.spec.plugin.spec,
		[panel.spec.plugin.spec],
	);

	const builderQueries = useMemo(
		() => getBuilderQueries(panel.spec.queries || []),
		[panel.spec.queries],
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
		(slice: PieSlice, event: ReactMouseEvent): void => {
			if (!onClick) {
				return;
			}
			const payload = enrichPieClick({
				slice,
				builderQueries,
				coordinates: { x: event.clientX, y: event.clientY },
				timeRange: getPanelTimeRange(data.requestPayload),
			});
			if (payload) {
				onClick(payload);
			}
		},
		[onClick, builderQueries, data.requestPayload],
	);

	return (
		<div data-testid="pie-panel-renderer" className={PanelStyles.panelContainer}>
			{slices.length === 0 ? (
				<NoData isFetching={isFetching} onRetry={refetch} />
			) : (
				<Pie
					data={slices}
					yAxisUnit={spec.formatting?.unit}
					decimalPrecision={decimalPrecision}
					isDarkMode={isDarkMode}
					position={legendPosition}
					id={panelId}
					onSliceClick={enableDrillDown ? handleSliceClick : undefined}
					data-testid="pie-chart"
				/>
			)}
		</div>
	);
}

export default PiePanelRenderer;
