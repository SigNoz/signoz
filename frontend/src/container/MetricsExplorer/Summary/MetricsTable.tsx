import { useCallback } from 'react';
import { LoadingOutlined } from '@ant-design/icons';
import {
	Spin,
	Table,
	TablePaginationConfig,
	TableProps,
	Tooltip,
	Typography,
} from 'antd';
import type { SorterResult } from 'antd/es/table/interface';
import { Querybuildertypesv5OrderDirectionDTO } from 'api/generated/services/sigNoz.schemas';
import ErrorInPlace from 'components/ErrorInPlace/ErrorInPlace';
import { Info } from 'lucide-react';

import emptyStateUrl from '@/assets/Icons/emptyState.svg';

import { MetricsListItemRowData, MetricsTableProps } from './types';
import { getMetricsTableColumns } from './utils';

function MetricsTable({
	isLoading,
	isError,
	error,
	data,
	pageSize,
	currentPage,
	onPaginationChange,
	setOrderBy,
	totalCount,
	openMetricDetails,
	queryFilterExpression,
	onFilterChange,
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
					key: {
						name: sorter.field as string,
					},
					direction:
						sorter.order === 'ascend'
							? Querybuildertypesv5OrderDirectionDTO.asc
							: Querybuildertypesv5OrderDirectionDTO.desc,
				});
			} else {
				setOrderBy({
					key: {
						name: 'samples',
					},
					direction: Querybuildertypesv5OrderDirectionDTO.desc,
				});
			}
		},
		[setOrderBy],
	);

	return (
		<div className="metrics-table-container">
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
			{isError && error ? (
				<ErrorInPlace error={error} />
			) : (
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
					columns={getMetricsTableColumns(queryFilterExpression, onFilterChange)}
					locale={{
						emptyText: isLoading ? null : (
							<div
								className="no-metrics-message-container"
								data-testid="metrics-table-empty-state"
							>
								<img
									src={emptyStateUrl}
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
					onRow={(record): Record<string, unknown> => ({
						onClick: (event: React.MouseEvent): void =>
							openMetricDetails(record.key, 'list', event),
						className: 'clickable-row',
					})}
				/>
			)}
		</div>
	);
}

export default MetricsTable;
