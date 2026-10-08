import { useCallback, useMemo } from 'react';
import { prepareScalarTables } from 'pages/DashboardPage/DashboardContainer/queryV5/prepareScalarTables';
import { getScalarResults } from 'pages/DashboardPage/DashboardContainer/queryV5/v5ResponseData';

import NoData from '../../components/NoData/NoData';
import PanelStyles from '../../panel.module.scss';
import type { PanelRendererProps } from '../../types/rendererProps';
import { resolveDecimalPrecision } from '../../utils/chartAppearance/resolvers';
import { enrichPieClick } from '../../utils/drilldown/enrichPieClick';
import { getBuilderQueries } from '../../utils/getBuilderQueries';
import { getPanelTimeRange } from '../../utils/getPanelTimeRange';
import { mapNumberThresholds } from '../NumberPanel/utils';

import TopList from './components/TopList/TopList';
import { prepareTopListRows } from './prepareData';
import type { TopListRow } from './types';
import { ACCENT_COLOR, type RowColors } from './utils';

function TopListPanelRenderer({
	panel,
	data,
	isFetching,
	refetch,
	onClick,
	enableDrillDown,
}: PanelRendererProps<'signoz/TopListPanel'>): JSX.Element {
	const spec = panel.spec.plugin.spec;

	const { rows } = useMemo(
		() =>
			prepareTopListRows(
				prepareScalarTables({
					results: getScalarResults(data.response),
					legendMap: data.legendMap ?? {},
					requestPayload: data.requestPayload,
				}),
			),
		[data.response, data.legendMap, data.requestPayload],
	);

	const thresholds = useMemo(
		() => mapNumberThresholds(spec.thresholds),
		[spec.thresholds],
	);

	const precision = useMemo(
		() => resolveDecimalPrecision(spec.formatting?.decimalPrecision),
		[spec.formatting?.decimalPrecision],
	);

	const builderQueries = useMemo(
		() => getBuilderQueries(panel.spec.queries || []),
		[panel.spec.queries],
	);

	const handleSelect = useCallback(
		(
			row: TopListRow,
			colors: RowColors,
			coordinates: { x: number; y: number },
		): void => {
			if (!onClick) {
				return;
			}
			const payload = enrichPieClick({
				slice: {
					label: row.label,
					value: row.value ?? 0,
					color: colors.barColor ?? ACCENT_COLOR,
					queryName: row.queryName,
					labels: row.labels,
				},
				builderQueries,
				coordinates,
				timeRange: getPanelTimeRange(data.requestPayload),
			});
			if (payload) {
				onClick(payload);
			}
		},
		[onClick, builderQueries, data.requestPayload],
	);

	return (
		<div
			data-testid="top-list-panel-renderer"
			className={PanelStyles.panelContainer}
		>
			{rows.length === 0 ? (
				<NoData isFetching={isFetching} onRetry={refetch} panel={panel} />
			) : (
				<TopList
					rows={rows}
					unit={spec.formatting?.unit}
					precision={precision}
					thresholds={thresholds}
					onSelect={enableDrillDown ? handleSelect : undefined}
				/>
			)}
		</div>
	);
}

export default TopListPanelRenderer;
