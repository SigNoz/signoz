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
import { Info } from 'lucide-react';
import { useCallback } from 'react';

import { MetricsListItemRowData, MetricsTableProps } from './types';
import { getMetricsTableColumns } from './utils';

function MetricsTable({
	isLoading,
	isError,
	data,
	pageSize,
	currentPage,
	onPaginationChange,
	setOrderBy,
	totalCount,
	openMetricDetails,
	queryFilters,
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
			{!isError && !isLoading && (
				<div className="metrics-table-title" data-testid="metrics-table-title">
					<Typography.Title level={4} className="metrics-table-title">
						List View
					</Typography.Title>
					<Tooltip
						title="The table displays all metrics in the selected time range. Each row represents a unique metric, and its metric name, and metadata like description, type, unit, and samples/timeseries cardinality observed in the selected time range."
						placement="right"
					>
						<Info size={16} />
					</Tooltip>
				</div>
			)}
			<Table
				loading={{
					spinning: isLoading,
					indicator: (
						<Spin
							data-testid="metrics-table-loading-state"
							indicator={<LoadingOutlined size={14} spin />}
						/>
					),
				}}
				dataSource={data}
				columns={getMetricsTableColumns(queryFilters)}
				locale={{
					emptyText: isLoading ? null : (
						<div
							className="no-metrics-message-container"
							data-testid={
								isError ? 'metrics-table-error-state' : 'metrics-table-empty-state'
							}
						>
							<img
								src="/Icons/emptyState.svg"
								alt="thinking-emoji"
								className="empty-state-svg"
							/>
							<Typography.Text className="no-metrics-message">
								{isError
									? 'Error fetching metrics. If the problem persists, please contact support.'
									: 'This query had no results. Edit your query and try again!'}
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
					onClick: (): void => openMetricDetails(record.key, 'list'),
					className: 'clickable-row',
				})}
			/>
		</div>
	);
}

export default MetricsTable;
