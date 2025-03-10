import { Color } from '@signozhq/design-tokens';
import { Tooltip, Typography } from 'antd';
import { ColumnType } from 'antd/es/table';
import {
	MetricsListItemData,
	MetricsListPayload,
	MetricType,
} from 'api/metricsExplorer/getMetricsList';
import {
	CardinalityData,
	DatapointsData,
} from 'api/metricsExplorer/getMetricsTreeMap';
import {
	BarChart,
	BarChart2,
	BarChartHorizontal,
	Diff,
	Gauge,
} from 'lucide-react';
import { useMemo } from 'react';

import { METRIC_TYPE_LABEL_MAP } from './constants';
import { MetricsListItemRowData, TreemapTile, TreemapViewType } from './types';

export const metricsTableColumns: ColumnType<MetricsListItemRowData>[] = [
	{
		title: <div className="metric-name-column-header">METRIC</div>,
		dataIndex: 'metric_name',
		width: 400,
		sorter: true,
		className: 'metric-name-column-header',
		render: (value: string): React.ReactNode => (
			<div className="metric-name-column-value">{value}</div>
		),
	},
	{
		title: 'DESCRIPTION',
		dataIndex: 'description',
		width: 400,
	},
	{
		title: 'TYPE',
		dataIndex: 'metric_type',
		sorter: true,
		width: 150,
	},
	{
		title: 'UNIT',
		dataIndex: 'unit',
		width: 150,
	},
	{
		title: 'DATAPOINTS',
		dataIndex: TreemapViewType.DATAPOINTS,
		width: 150,
		sorter: true,
	},
	{
		title: 'CARDINALITY',
		dataIndex: TreemapViewType.CARDINALITY,
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

export function MetricTypeRenderer({
	type,
}: {
	type: MetricType;
}): JSX.Element {
	const [icon, color] = useMemo(() => {
		switch (type) {
			case MetricType.SUM:
				return [
					<Diff key={type} size={12} color={Color.BG_ROBIN_500} />,
					Color.BG_ROBIN_500,
				];
			case MetricType.GAUGE:
				return [
					<Gauge key={type} size={12} color={Color.BG_SAKURA_500} />,
					Color.BG_SAKURA_500,
				];
			case MetricType.HISTOGRAM:
				return [
					<BarChart2 key={type} size={12} color={Color.BG_SIENNA_500} />,
					Color.BG_SIENNA_500,
				];
			case MetricType.SUMMARY:
				return [
					<BarChartHorizontal key={type} size={12} color={Color.BG_FOREST_500} />,
					Color.BG_FOREST_500,
				];
			case MetricType.EXPONENTIAL_HISTOGRAM:
				return [
					<BarChart key={type} size={12} color={Color.BG_AQUA_500} />,
					Color.BG_AQUA_500,
				];
			default:
				return [null, ''];
		}
	}, [type]);

	return (
		<div
			className="metric-type-renderer"
			style={{
				backgroundColor: `${color}33`,
				border: `1px solid ${color}`,
				color,
			}}
		>
			{icon}
			<Typography.Text style={{ color, fontSize: 12 }}>
				{METRIC_TYPE_LABEL_MAP[type]}
			</Typography.Text>
		</div>
	);
}

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

export const formatDataForMetricsTable = (
	data: MetricsListItemData[],
): MetricsListItemRowData[] =>
	data.map((metric) => ({
		key: metric.metric_name,
		metric_name: (
			<ValidateRowValueWrapper value={metric.metric_name}>
				<Tooltip title={metric.metric_name}>{metric.metric_name}</Tooltip>
			</ValidateRowValueWrapper>
		),
		description: (
			<ValidateRowValueWrapper value={metric.description}>
				<Tooltip title={metric.description}>{metric.description}</Tooltip>
			</ValidateRowValueWrapper>
		),
		metric_type: <MetricTypeRenderer type={metric.type} />,
		unit: (
			<ValidateRowValueWrapper value={metric.unit}>
				{metric.unit}
			</ValidateRowValueWrapper>
		),
		[TreemapViewType.DATAPOINTS]: (
			<ValidateRowValueWrapper value={metric[TreemapViewType.DATAPOINTS]}>
				{metric[TreemapViewType.DATAPOINTS].toLocaleString()}
			</ValidateRowValueWrapper>
		),
		[TreemapViewType.CARDINALITY]: (
			<ValidateRowValueWrapper value={metric[TreemapViewType.CARDINALITY]}>
				{metric[TreemapViewType.CARDINALITY]}
			</ValidateRowValueWrapper>
		),
	}));

export const transformTreemapData = (
	data: CardinalityData[] | DatapointsData[],
	viewType: TreemapViewType,
): TreemapTile[] => {
	const totalSize = (data as (CardinalityData | DatapointsData)[]).reduce(
		(acc: number, item: CardinalityData | DatapointsData) =>
			acc + item.percentage,
		0,
	);

	const children = data.map((item) => ({
		id: item.metric_name,
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
