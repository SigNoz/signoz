import { LoadingOutlined } from '@ant-design/icons';
import {
	Spin,
	Table,
	TablePaginationConfig,
	TableProps,
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
					columnName: 'type',
					order: 'asc',
				});
			}
		},
		[setOrderBy],
	);

	return (
		<div className="metrics-table-container">
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
