import { Table, Typography } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { useMemo } from 'react';

import { InspectionStep, TableViewDataItem, TableViewProps } from './types';
import { getTimeSeriesLabel } from './utils';

function TableView({
	inspectionStep,
	inspectMetricsTimeSeries,
	setShowExpandedView,
	setExpandedViewOptions,
}: TableViewProps): JSX.Element {
	const columns: ColumnsType<TableViewDataItem> = useMemo(
		() => [
			{
				title: 'Time Series',
				dataIndex: 'title',
				ellipsis: true,
				width: 80,
				align: 'left',
			},
			{
				title: 'Values',
				dataIndex: 'values',
				ellipsis: true,
				width: 80,
				align: 'left',
			},
		],
		[],
	);

	const dataSource: TableViewDataItem[] = useMemo(
		() =>
			inspectMetricsTimeSeries.map((series, index) => ({
				key: index,
				title: (
					<div className="table-view-title-header">
						<Typography.Text style={{ color: series.strokeColor }}>
							{inspectionStep === InspectionStep.COMPLETED && series.title
								? series.title
								: getTimeSeriesLabel(series, series.strokeColor)}
						</Typography.Text>
					</div>
				),
				values: (
					<div className="table-view-values-header">
						<Typography.Text>
							{series.values
								.map((value) => `(${value.timestamp}, ${value.value})`)
								.join(', ')}
						</Typography.Text>
					</div>
				),
			})),
		[inspectMetricsTimeSeries, inspectionStep],
	);

	const openExpandedView = (record: TableViewDataItem): void => {
		setShowExpandedView(true);
		const timeSeries = inspectMetricsTimeSeries[record.key];
		setExpandedViewOptions({
			x: 0,
			y: 0,
			value: Number(timeSeries.values[0].value),
			timestamp: timeSeries.values[0].timestamp,
			timeSeries,
		});
	};

	return (
		<Table
			className="inspect-metrics-table-view"
			dataSource={dataSource}
			columns={columns}
			onRow={(record): { onClick: () => void; className: string } => ({
				onClick: (): void => openExpandedView(record),
				className: 'expanded-clickable-row',
			})}
		/>
	);
}

export default TableView;
