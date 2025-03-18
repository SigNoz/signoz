import { LoadingOutlined } from '@ant-design/icons';
import {
	Spin,
	Table,
	TablePaginationConfig,
	TableProps,
	Tooltip,
	Typography,
} from 'antd';
import { SorterResult } from 'antd/es/table/interface';
import { useCallback } from 'react';

import { MetricsListItemRowData, MetricsTableProps } from './types';
import { metricsTableColumns } from './utils';

function MetricsTable({
	isLoading,
	data,
	pageSize,
	currentPage,
	onPaginationChange,
	setOrderBy,
	totalCount,
	openMetricDetails,
}: MetricsTableProps): JSX.Element {
	const handleTableChange: TableProps<MetricsListItemRowData>['onChange'] = useCallback(
		(
			_pagination: TablePaginationConfig,
			_filters: Record<string, (string | number | boolean)[] | null>,
			sorter:
				| SorterResult<MetricsListItemRowData>
				| SorterResult<MetricsListItemRowData>[],
		): void => {
			if ('field' in sorter && sorter.order) {
				setOrderBy({
					columnName: sorter.field as string,
					order: sorter.order === 'ascend' ? 'asc' : 'desc',
				});
			} else {
				setOrderBy({
					columnName: 'samples',
					order: 'desc',
				});
			}
		},
		[setOrderBy],
	);

	return (
		<div className="metrics-table-container">
			<Typography.Title level={4} className="metrics-table-title">
				Metrics List
				<Tooltip
					title="The table displays all metrics in the selected time range. Each row represents a unique metric, and its metric name, and metadata like description, type, unit, and samples/timeseries cardinality observed in the selected time range."
					placement="right"
				>
					<span style={{ marginLeft: '2px' }}>
						<svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								fillRule="evenodd"
								clipRule="evenodd"
								d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22ZM12 9C11.4477 9 11 9.44772 11 10V16C11 16.5523 11.4477 17 12 17C12.5523 17 13 16.5523 13 16V10C13 9.44772 12.5523 9 12 9ZM12 8C12.5523 8 13 7.55228 13 7C13 6.44772 12.5523 6 12 6C11.4477 6 11 6.44772 11 7C11 7.55228 11.4477 8 12 8Z"
								fill="currentColor"
							/>
						</svg>
					</span>
				</Tooltip>
			</Typography.Title>
			<Table
				loading={{
					spinning: isLoading,
					indicator: <Spin indicator={<LoadingOutlined size={14} spin />} />,
				}}
				dataSource={data}
				columns={metricsTableColumns}
				locale={{
					emptyText: isLoading ? null : (
						<div className="no-metrics-message-container">
							<img
								src="/Icons/emptyState.svg"
								alt="thinking-emoji"
								className="empty-state-svg"
							/>
							<Typography.Text className="no-metrics-message">
								This query had no results. Edit your query and try again!
							</Typography.Text>
						</div>
					),
				}}
				tableLayout="fixed"
				onChange={handleTableChange}
				pagination={{
					current: currentPage,
					pageSize,
					showSizeChanger: true,
					hideOnSinglePage: false,
					onChange: onPaginationChange,
					total: totalCount,
				}}
				onRow={(record): { onClick: () => void; className: string } => ({
					onClick: (): void => openMetricDetails(record.key),
					className: 'clickable-row',
				})}
			/>
		</div>
	);
}

export default MetricsTable;
