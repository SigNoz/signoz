import type { TableColumnsType as ColumnsType } from 'antd';
import { Card, Flex, Table } from 'antd';
import { Typography } from '@signozhq/ui/typography';

import { InspectMetricsSeries } from './types';
import { TableViewProps } from './types';
import { formatTimestampToFullDateTime } from './utils';

function TableView({
	inspectMetricsTimeSeries,
	setShowExpandedView,
	setExpandedViewOptions,
	isInspectMetricsRefetching,
	metricInspectionAppliedOptions,
}: TableViewProps): JSX.Element {
	const isSpaceAggregatedWithoutLabel =
		!!metricInspectionAppliedOptions.spaceAggregationOption &&
		metricInspectionAppliedOptions.spaceAggregationLabels.length === 0;

	const labelKeys = isSpaceAggregatedWithoutLabel
		? []
		: inspectMetricsTimeSeries.length > 0
			? Object.keys(inspectMetricsTimeSeries[0].labels)
			: [];

	const getDynamicColumnStyle = (strokeColor?: string): React.CSSProperties => {
		const style: React.CSSProperties = {
			maxWidth: '200px',
			whiteSpace: 'nowrap',
			overflow: 'hidden',
			textOverflow: 'ellipsis',
		};
		if (strokeColor) {
			style.color = strokeColor;
		}
		return style;
	};

	const columns = [
		...labelKeys.map((label) => ({
			title: label,
			dataIndex: label,
			align: 'left' as const,
			render: (text: string): JSX.Element => (
				<div style={getDynamicColumnStyle()}>{text}</div>
			),
		})),
		{
			title: 'Values',
			dataIndex: 'values',
			align: 'left' as const,
			sticky: 'right' as const,
		},
	];

	const openExpandedView = (
		series: InspectMetricsSeries,
		value: string,
		timestamp: number,
	): void => {
		setShowExpandedView(true);
		setExpandedViewOptions({
			x: timestamp,
			y: Number(value),
			value: Number(value),
			timestamp,
			timeSeries: series,
		});
	};

	const dataSource = inspectMetricsTimeSeries.map((series, index) => {
		const labelData: Record<string, JSX.Element> = {};
		for (const label of labelKeys) {
			labelData[label] = (
				<div style={getDynamicColumnStyle(series.strokeColor)}>
					{series.labels[label]}
				</div>
			);
		}

		return {
			key: index,
			...labelData,
			values: (
				<div className="table-view-values-header">
					<Flex gap={8}>
						{series.values.map((value) => {
							const formattedValue = `(${formatTimestampToFullDateTime(
								value.timestamp,
								true,
							)}, ${value.value})`;
							return (
								<Card
									key={formattedValue}
									onClick={(): void =>
										openExpandedView(series, value.value, value.timestamp)
									}
								>
									<Typography.Text>{formattedValue}</Typography.Text>
								</Card>
							);
						})}
					</Flex>
				</div>
			),
		};
	});

	return (
		<Table
			className="inspect-metrics-table-view"
			dataSource={dataSource}
			columns={
				columns as ColumnsType<{
					values: JSX.Element;
					key: number;
				}>
			}
			scroll={{ x: '100%' }}
			loading={isInspectMetricsRefetching}
		/>
	);
}

export default TableView;
