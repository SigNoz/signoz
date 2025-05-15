import { Card, Flex, Table, Typography } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { InspectMetricsSeries } from 'api/metricsExplorer/getInspectMetricsDetails';
import { useCallback, useMemo } from 'react';

import { TableViewProps } from './types';
import { formatTimestampToFullDateTime } from './utils';

function TableView({
	inspectMetricsTimeSeries,
	setShowExpandedView,
	setExpandedViewOptions,
	isInspectMetricsRefetching,
	metricInspectionOptions,
}: TableViewProps): JSX.Element {
	const isSpaceAggregatedWithoutLabel = useMemo(
		() =>
			!!metricInspectionOptions.spaceAggregationOption &&
			metricInspectionOptions.spaceAggregationLabels.length === 0,
		[metricInspectionOptions],
	);
	const labelKeys = useMemo(() => {
		if (isSpaceAggregatedWithoutLabel) {
			return [];
		}
		if (inspectMetricsTimeSeries.length > 0) {
			return Object.keys(inspectMetricsTimeSeries[0].labels);
		}
		return [];
	}, [inspectMetricsTimeSeries, isSpaceAggregatedWithoutLabel]);

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

	const columns = useMemo(
		() => [
			...labelKeys.map((label) => ({
				title: label,
				dataIndex: label,
				align: 'left',
				render: (text: string): JSX.Element => (
					<div style={getDynamicColumnStyle()}>{text}</div>
				),
			})),
			{
				title: 'Values',
				dataIndex: 'values',
				align: 'left',
				sticky: 'right',
			},
		],
		[labelKeys],
	);
	const openExpandedView = useCallback(
		(series: InspectMetricsSeries, value: string, timestamp: number): void => {
			setShowExpandedView(true);
			setExpandedViewOptions({
				x: timestamp,
				y: Number(value),
				value: Number(value),
				timestamp,
				timeSeries: series,
			});
		},
		[setShowExpandedView, setExpandedViewOptions],
	);

	const dataSource = useMemo(
		() =>
			inspectMetricsTimeSeries.map((series, index) => {
				const labelData = labelKeys.reduce((acc, label) => {
					acc[label] = (
						<div style={getDynamicColumnStyle(series.strokeColor)}>
							{series.labels[label]}
						</div>
					);
					return acc;
				}, {} as Record<string, JSX.Element>);

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
			}),
		[inspectMetricsTimeSeries, labelKeys, openExpandedView],
	);

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
