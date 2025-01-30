import { LoadingOutlined } from '@ant-design/icons';
import {
	Skeleton,
	Spin,
	Table,
	TablePaginationConfig,
	TableProps,
	Typography,
} from 'antd';
import { SorterResult } from 'antd/es/table/interface';
import logEvent from 'api/common/logEvent';
import { useCallback, useMemo } from 'react';

import HostsEmptyOrIncorrectMetrics from './HostsEmptyOrIncorrectMetrics';
import {
	formatDataForTable,
	getHostsListColumns,
	HostRowData,
	HostsListTableProps,
} from './utils';

export default function HostsListTable({
	isLoading,
	isFetching,
	isError,
	tableData: data,
	hostMetricsData,
	filters,
	setSelectedHostName,
	currentPage,
	setCurrentPage,
	pageSize,
	setOrderBy,
	setPageSize,
}: HostsListTableProps): JSX.Element {
	const columns = useMemo(() => getHostsListColumns(), []);

	const sentAnyHostMetricsData = useMemo(
		() => data?.payload?.data?.sentAnyHostMetricsData || false,
		[data],
	);

	const isSendingIncorrectK8SAgentMetrics = useMemo(
		() => data?.payload?.data?.isSendingK8SAgentMetrics || false,
		[data],
	);

	const formattedHostMetricsData = useMemo(
		() => formatDataForTable(hostMetricsData),
		[hostMetricsData],
	);

	const totalCount = data?.payload?.data?.total || 0;

	const handleTableChange: TableProps<HostRowData>['onChange'] = useCallback(
		(
			pagination: TablePaginationConfig,
			_filters: Record<string, (string | number | boolean)[] | null>,
			sorter: SorterResult<HostRowData> | SorterResult<HostRowData>[],
		): void => {
			if (pagination.current) {
				setCurrentPage(pagination.current);
			}

			if ('field' in sorter && sorter.order) {
				setOrderBy({
					columnName: sorter.field as string,
					order: sorter.order === 'ascend' ? 'asc' : 'desc',
				});
			} else {
				setOrderBy(null);
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);

	const handleRowClick = (record: HostRowData): void => {
		setSelectedHostName(record.hostName);
		logEvent('Infra Monitoring: Hosts list item clicked', {
			host: record.hostName,
		});
	};

	const showNoFilteredHostsMessage =
		!isFetching &&
		!isLoading &&
		formattedHostMetricsData.length === 0 &&
		filters.items.length > 0;

	const showHostsEmptyState =
		!isFetching &&
		!isLoading &&
		(!sentAnyHostMetricsData || isSendingIncorrectK8SAgentMetrics) &&
		!filters.items.length;

	if (isError) {
		return <Typography>{data?.error || 'Something went wrong'}</Typography>;
	}

	if (showHostsEmptyState) {
		return (
			<HostsEmptyOrIncorrectMetrics
				noData={!sentAnyHostMetricsData}
				incorrectData={isSendingIncorrectK8SAgentMetrics}
			/>
		);
	}

	if (showNoFilteredHostsMessage) {
		return (
			<div className="no-filtered-hosts-message-container">
				<div className="no-filtered-hosts-message-content">
					<img
						src="/Icons/emptyState.svg"
						alt="thinking-emoji"
						className="empty-state-svg"
					/>

					<Typography.Text className="no-filtered-hosts-message">
						This query had no results. Edit your query and try again!
					</Typography.Text>
				</div>
			</div>
		);
	}

	if (isLoading || isFetching) {
		return (
			<div className="hosts-list-loading-state">
				<Skeleton.Input
					className="hosts-list-loading-state-item"
					size="large"
					block
					active
				/>
				<Skeleton.Input
					className="hosts-list-loading-state-item"
					size="large"
					block
					active
				/>
				<Skeleton.Input
					className="hosts-list-loading-state-item"
					size="large"
					block
					active
				/>
			</div>
		);
	}

	return (
		<Table
			className="hosts-list-table"
			dataSource={isLoading || isFetching ? [] : formattedHostMetricsData}
			columns={columns}
			pagination={{
				current: currentPage,
				pageSize,
				total: totalCount,
				showSizeChanger: true,
				hideOnSinglePage: false,
				onChange: (page, pageSize): void => {
					setCurrentPage(page);
					setPageSize(pageSize);
				},
			}}
			scroll={{ x: true }}
			loading={{
				spinning: isFetching || isLoading,
				indicator: <Spin indicator={<LoadingOutlined size={14} spin />} />,
			}}
			tableLayout="fixed"
			rowKey={(record): string => record.hostName}
			onChange={handleTableChange}
			onRow={(record): { onClick: () => void; className: string } => ({
				onClick: (): void => handleRowClick(record),
				className: 'clickable-row',
			})}
		/>
	);
}
