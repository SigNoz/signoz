import { useCallback, useMemo } from 'react';
import { Earth } from '@signozhq/icons';
import type { DashboardtypesGeoMapPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';
import { useIsDarkMode } from 'hooks/useDarkMode';
import GeoMap from 'lib/visualization/charts/GeoMap/GeoMap';
import { isSubdivisionCountry } from 'lib/visualization/charts/GeoMap/geo/subdivisions';
import { useSubdivisionSet } from 'lib/visualization/charts/GeoMap/hooks/useSubdivisionSet';
import type { GeoMapSelection } from 'lib/visualization/charts/GeoMap/types';
import TooltipFooter from 'lib/visualization/panels/components/TooltipFooter';

import NoData from '../../../../components/NoData/NoData';
import PanelMessage from '../../../../components/PanelMessage/PanelMessage';
import type { PanelRendererProps } from '../../../../types/rendererProps';
import {
	resolveDecimalPrecision,
	resolveLegendPosition,
} from '../../../../utils/chartAppearance/resolvers';
import { enrichGeoMapClick } from '../../../../utils/drilldown/enrichGeoMapClick';
import { formatPanelValue } from '../../../../utils/formatPanelValue';
import { getBuilderQueries } from '../../../../utils/getBuilderQueries';
import { getColumnUnit } from '../../../../utils/getColumnUnit';
import { getJoinedScalarTable } from '../../../../utils/getJoinedScalarTable';
import { getPanelTimeRange } from '../../../../utils/getPanelTimeRange';
import { getValueColumnLabels } from '../../../../utils/getValueColumnLabels';
import { toPanelThreshold } from '../../../../utils/mapComparisonThreshold';
import {
	resolveBubbleRadius,
	resolveColors,
	resolveColorScale,
	toColorKeys,
} from '../../chartOptions';
import { prepareGeoMapData, toText } from '../../prepareData';
import { withTooltipDetails } from '../../tooltipDetails';
import { LocationKind } from '../../types';
import { getGeoMapEmptyMessage } from '../../warnings';

// A map tooltip can't be pinned, so there is nothing to dismiss.
const keepUnpinned = (): void => undefined;

/** The map and everything that loads with it; split from the renderer so dashboards without a map never fetch it. */
export default function GeoMapPanelBody({
	panelId,
	panel,
	data,
	isFetching,
	refetch,
	onClick,
	enableDrillDown,
}: PanelRendererProps<'signoz/GeoMapPanel'>): JSX.Element {
	const isDarkMode = useIsDarkMode();
	const spec = useMemo<DashboardtypesGeoMapPanelSpecDTO>(
		() => panel.spec.plugin.spec,
		[panel.spec.plugin.spec],
	);
	const { map, location, chartAppearance, formatting } = spec;
	const thresholds = useMemo(
		() => (spec.thresholds ?? []).map(toPanelThreshold),
		[spec.thresholds],
	);
	const country = isSubdivisionCountry(map?.viewCountry)
		? map?.viewCountry
		: undefined;
	const { set: subdivisions, status: statesStatus } = useSubdivisionSet(
		map?.view === 'country' ? country : undefined,
	);

	const table = useMemo(() => getJoinedScalarTable(data), [data]);
	const geoData = useMemo(
		() =>
			prepareGeoMapData({
				table,
				location,
				map,
				scale: resolveColorScale(chartAppearance?.colors),
				subdivisions,
				thresholds,
				columnUnits: formatting?.columnUnits ?? undefined,
			}),
		[
			table,
			location,
			map,
			chartAppearance?.colors,
			subdivisions,
			thresholds,
			formatting?.columnUnits,
		],
	);

	const columnUnits = formatting?.columnUnits;
	const precision = resolveDecimalPrecision(formatting?.decimalPrecision);
	const formatterFor = useCallback(
		(columnId: string) =>
			(value: number): string =>
				formatPanelValue(
					value,
					getColumnUnit(columnId, columnUnits ?? {}),
					precision,
				),
		[columnUnits, precision],
	);
	const labels = useMemo(
		() => getValueColumnLabels(table?.columns ?? []),
		[table?.columns],
	);
	const { colorColumn, sizeColumn } = geoData;
	const formatValue = useMemo(
		() => formatterFor(colorColumn?.id ?? ''),
		[formatterFor, colorColumn?.id],
	);
	const sizeMetric = useMemo(
		() =>
			sizeColumn && {
				label: labels[sizeColumn.id] ?? sizeColumn.name,
				formatValue: formatterFor(sizeColumn.id),
			},
		[sizeColumn, labels, formatterFor],
	);
	const { regions, points } = useMemo(
		() => withTooltipDetails({ table, data: geoData, labels, formatterFor }),
		[table, geoData, labels, formatterFor],
	);
	const colors = useMemo(
		() => resolveColors(chartAppearance?.colors),
		[chartAppearance?.colors],
	);
	const bubbleRadius = useMemo(
		() => resolveBubbleRadius(chartAppearance?.bubbles, geoData.layer),
		[chartAppearance?.bubbles, geoData.layer],
	);
	const colorKeys = useMemo(() => toColorKeys(thresholds), [thresholds]);

	const builderQueries = useMemo(
		() => getBuilderQueries(panel.spec.queries || []),
		[panel.spec.queries],
	);
	const handleSelect = useCallback(
		({ datum, point, clientX, clientY }: GeoMapSelection): void => {
			const row =
				table?.rows[geoData.rowIndexById.get(point?.id ?? datum.code) ?? -1];
			if (!onClick || !row) {
				return;
			}
			const groupColumns = (table?.columns ?? []).filter(
				(column) => !column.isValueColumn,
			);
			const payload = enrichGeoMapClick({
				labels: Object.fromEntries(
					groupColumns.map((column) => [column.name, toText(row.data[column.id])]),
				),
				label: point
					? point.label || `${point.lat.toFixed(2)}, ${point.lon.toFixed(2)}`
					: datum.raw,
				queryNames: [colorColumn?.queryName, sizeColumn?.queryName].filter(
					(name): name is string => Boolean(name),
				),
				builderQueries,
				coordinates: { x: clientX, y: clientY },
				timeRange: getPanelTimeRange(data.requestPayload),
			});
			if (payload) {
				onClick(payload);
			}
		},
		[
			onClick,
			table,
			geoData.rowIndexById,
			colorColumn?.queryName,
			sizeColumn?.queryName,
			builderQueries,
			data.requestPayload,
		],
	);
	const renderTooltipFooter = useCallback(
		() => (
			<TooltipFooter
				id={panelId}
				isPinned={false}
				canPin={false}
				canDrilldown
				dismiss={keepUnpinned}
			/>
		),
		[panelId],
	);
	const emptyMessage = getGeoMapEmptyMessage(geoData);
	const isDrawable = geoData.regions.length > 0 || geoData.points.length > 0;
	// The chart reports loading or a failed states file itself, with a retry.
	const isWaitingForStates =
		geoData.location?.kind === LocationKind.Subdivision &&
		(statesStatus === 'loading' || statesStatus === 'failed');

	if (!isDrawable && emptyMessage && !isWaitingForStates) {
		return (
			<PanelMessage
				icon={<Earth size={18} />}
				title={emptyMessage.title}
				description={emptyMessage.description}
				data-testid="geo-map-empty-message"
			/>
		);
	}
	if (geoData.totalRows === 0) {
		return <NoData isFetching={isFetching} onRetry={refetch} panel={panel} />;
	}
	return (
		<GeoMap
			data={regions}
			points={points}
			view={map?.view ?? 'world'}
			projection={map?.projection ?? 'mercator'}
			country={country}
			layer={geoData.layer}
			colors={colors}
			bubbleRadius={bubbleRadius}
			formatValue={formatValue}
			valueLabel={
				colorColumn ? (labels[colorColumn.id] ?? colorColumn.name) : undefined
			}
			sizeMetric={sizeMetric}
			showLabels={chartAppearance?.labels ?? true}
			colorKeys={colorKeys}
			legendPosition={resolveLegendPosition(spec.legend?.position)}
			onSelect={enableDrillDown ? handleSelect : undefined}
			renderTooltipFooter={enableDrillDown ? renderTooltipFooter : undefined}
			isDarkMode={isDarkMode}
		/>
	);
}
