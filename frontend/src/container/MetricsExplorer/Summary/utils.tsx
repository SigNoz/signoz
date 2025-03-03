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
		dataIndex: 'name',
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
		dataIndex: 'type',
		width: 150,
	},
	{
		title: 'UNIT',
		dataIndex: 'unit',
		width: 150,
	},
	{
		title: 'DATAPOINTS',
		dataIndex: 'dataPoints',
		width: 150,
		sorter: true,
	},
	{
		title: 'CARDINALITY',
		dataIndex: 'cardinality',
		width: 150,
		sorter: true,
	},
];

export const getMetricsListQuery = (): MetricsListPayload => ({
	filters: {
		items: [],
		op: 'and',
	},
	orderBy: { columnName: 'type', order: 'asc' },
	heatmap: 'cardinality',
});

function MetricTypeRenderer({ type }: { type: MetricType }): JSX.Element {
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

export const formatDataForMetricsTable = (
	data: MetricsListItemData[],
): MetricsListItemRowData[] =>
	data.map((metric) => ({
		key: metric.name,
		name: <Tooltip title={metric.name}>{metric.name}</Tooltip>,
		description: (
			<Tooltip title={metric.description}>{metric.description}</Tooltip>
		),
		type: <MetricTypeRenderer type={metric.type} />,
		unit: metric.unit,
		dataPoints: metric.dataPoints,
		cardinality: metric.cardinality,
	}));

export const convertNanoSecondsToISOString = (nanos: number): string => {
	const milliseconds = Math.floor(nanos / 1_000_000);
	const date = new Date(milliseconds);
	return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
};

export const transformTreemapData = (
	data: CardinalityData[] | DatapointsData[],
	viewType: TreemapViewType,
): TreemapTile[] => {
	let totalSize: number;
	if (viewType === 'cardinality') {
		totalSize = (data as CardinalityData[]).reduce(
			(acc, item) => acc + item.relative_percentage,
			0,
		);
	} else {
		totalSize = (data as DatapointsData[]).reduce(
			(acc, item) => acc + item.percentage,
			0,
		);
	}

	const children = data.map((item) => {
		const percentage =
			viewType === 'cardinality'
				? (item as CardinalityData).relative_percentage
				: (item as DatapointsData).percentage;
		return {
			id: item.metric_name,
			size: percentage / totalSize,
			displayValue: percentage,
			parent: viewType,
		};
	});

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
