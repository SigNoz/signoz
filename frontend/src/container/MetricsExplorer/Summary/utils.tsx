import { Color } from '@signozhq/design-tokens';
import { Tooltip } from 'antd';
import { ColumnType } from 'antd/es/table';
import {
	MetricsexplorertypesStatDTO,
	MetricsexplorertypesTreemapEntryDTO,
	MetricsexplorertypesTreemapModeDTO,
} from 'api/generated/services/sigNoz.schemas';
import { MetricsListPayload } from 'api/metricsExplorer/getMetricsList';
import { Filter } from 'api/v5/v5';
import { getUniversalNameFromMetricUnit } from 'components/YAxisUnitSelector/utils';

import MetricNameSearch from './MetricNameSearch';
import MetricTypeRendererV2 from './MetricTypeRendererV2';
import { MetricsListItemRowData, TreemapTile } from './types';

export const getMetricsTableColumns = (
	queryFilterExpression: Filter,
	onFilterChange: (expression: string) => void,
): ColumnType<MetricsListItemRowData>[] => [
	{
		title: (
			<div className="metric-name-column-header">
				<span className="metric-name-column-header-text">METRIC</span>
				<MetricNameSearch
					queryFilterExpression={queryFilterExpression}
					onFilterChange={onFilterChange}
				/>
			</div>
		),
		dataIndex: 'metric_name',
		width: 400,
		sorter: false,
		render: (value: string): React.ReactNode => (
			<div className="metric-name-column-value">{value}</div>
		),
	},
	{
		title: 'DESCRIPTION',
		dataIndex: 'description',
		width: 400,
		render: (value: string): React.ReactNode => (
			<div className="metric-description-column-value">{value}</div>
		),
	},
	{
		title: (
			<div className="metric-type-column-header">
				<span className="metric-type-column-header-text">TYPE</span>
				{/* TODO: @amlannandy: Re-enable once API supports metric type filtering */}
				{/* <MetricTypeSearch
					queryFilters={queryFilters}
					onFilterChange={onFilterChange}
				/> */}
			</div>
		),
		dataIndex: 'metric_type',
		sorter: false,
		width: 150,
	},
	{
		title: 'UNIT',
		dataIndex: 'unit',
		width: 150,
	},
	{
		title: 'SAMPLES',
		dataIndex: MetricsexplorertypesTreemapModeDTO.samples,
		width: 150,
		sorter: true,
	},
	{
		title: 'TIME SERIES',
		dataIndex: MetricsexplorertypesTreemapModeDTO.timeseries,
		width: 150,
		sorter: true,
	},
];

export const getMetricsListQuery = (): MetricsListPayload => ({
	filters: {
		items: [],
		op: 'and',
	},
	orderBy: { columnName: 'metric_name', order: 'asc' },
});

function ValidateRowValueWrapper({
	value,
	children,
}: {
	value: string | number | null;
	children: React.ReactNode;
}): JSX.Element {
	if (!value) {
		return <div>-</div>;
	}
	return <div>{children}</div>;
}

export const formatNumberIntoHumanReadableFormat = (
	num: number,
	addPlusSign = true,
): string => {
	function format(num: number, divisor: number, suffix: string): string {
		const value = num / divisor;
		return value % 1 === 0
			? `${value}${suffix}${addPlusSign ? '+' : ''}`
			: `${value.toFixed(1).replace(/\.0$/, '')}${suffix}${
					addPlusSign ? '+' : ''
			  }`;
	}

	if (num >= 1_000_000_000) {
		return format(num, 1_000_000_000, 'B');
	}
	if (num >= 1_000_000) {
		return format(num, 1_000_000, 'M');
	}
	if (num >= 1_000) {
		return format(num, 1_000, 'K');
	}
	return num.toString();
};

export const formatDataForMetricsTable = (
	data: MetricsexplorertypesStatDTO[],
): MetricsListItemRowData[] =>
	data.map((metric) => ({
		key: metric.metricName,
		metric_name: (
			<ValidateRowValueWrapper value={metric.metricName}>
				<Tooltip title={metric.metricName}>{metric.metricName}</Tooltip>
			</ValidateRowValueWrapper>
		),
		description: (
			<ValidateRowValueWrapper value={metric.description}>
				<Tooltip className="description-tooltip" title={metric.description}>
					{metric.description}
				</Tooltip>
			</ValidateRowValueWrapper>
		),
		metric_type: <MetricTypeRendererV2 type={metric.type} />,
		unit: (
			<ValidateRowValueWrapper value={getUniversalNameFromMetricUnit(metric.unit)}>
				{getUniversalNameFromMetricUnit(metric.unit)}
			</ValidateRowValueWrapper>
		),
		[MetricsexplorertypesTreemapModeDTO.samples]: (
			<ValidateRowValueWrapper
				value={metric[MetricsexplorertypesTreemapModeDTO.samples]}
			>
				<Tooltip
					title={metric[MetricsexplorertypesTreemapModeDTO.samples].toLocaleString()}
				>
					{formatNumberIntoHumanReadableFormat(
						metric[MetricsexplorertypesTreemapModeDTO.samples],
					)}
				</Tooltip>
			</ValidateRowValueWrapper>
		),
		[MetricsexplorertypesTreemapModeDTO.timeseries]: (
			<ValidateRowValueWrapper
				value={metric[MetricsexplorertypesTreemapModeDTO.timeseries]}
			>
				<Tooltip
					title={metric[
						MetricsexplorertypesTreemapModeDTO.timeseries
					].toLocaleString()}
				>
					{formatNumberIntoHumanReadableFormat(
						metric[MetricsexplorertypesTreemapModeDTO.timeseries],
					)}
				</Tooltip>
			</ValidateRowValueWrapper>
		),
	}));

export const transformTreemapData = (
	data: MetricsexplorertypesTreemapEntryDTO[],
	viewType: MetricsexplorertypesTreemapModeDTO,
): TreemapTile[] => {
	const totalSize = data.reduce(
		(acc: number, item: MetricsexplorertypesTreemapEntryDTO) =>
			acc + item.percentage,
		0,
	);

	const children = data.map((item) => ({
		id: item.metricName,
		size: totalSize > 0 ? Number((item.percentage / totalSize).toFixed(2)) : 0,
		displayValue: Number(item.percentage).toFixed(2),
		parent: viewType,
	}));

	return [
		{
			id: viewType,
			size: 0,
			parent: null,
			displayValue: null,
		},
		...children,
	];
};

const getTreemapTileBackgroundColor = (node: TreemapTile): string => {
	const size = node.size * 10;
	if (size > 0.8) {
		return Color.BG_AMBER_600;
	}
	if (size > 0.6) {
		return Color.BG_AMBER_500;
	}
	if (size > 0.4) {
		return Color.BG_AMBER_400;
	}
	if (size > 0.2) {
		return Color.BG_AMBER_300;
	}
	if (size > 0.1) {
		return Color.BG_AMBER_200;
	}
	return Color.BG_AMBER_100;
};

export const getTreemapTileStyle = (
	node: TreemapTile,
): React.CSSProperties => ({
	overflow: 'visible',
	cursor: 'pointer',
	backgroundColor: getTreemapTileBackgroundColor(node),
	borderRadius: 4,
});

export const getTreemapTileTextStyle = (): React.CSSProperties => ({
	width: '100%',
	height: '100%',
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'center',
	fontSize: '12px',
	fontWeight: 'bold',
	color: Color.TEXT_SLATE_400,
	textAlign: 'center',
	padding: '4px',
});

export const convertNanoToMilliseconds = (time: number): number =>
	Math.floor(time / 1000000);
