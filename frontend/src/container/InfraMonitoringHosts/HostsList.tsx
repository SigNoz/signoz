import './InfraMonitoring.styles.scss';

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
import { HostListPayload } from 'api/infraMonitoring/getHostLists';
import HostMetricDetail from 'components/HostMetricsDetail';
import { useGetHostList } from 'hooks/infraMonitoring/useGetHostList';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { GlobalReducer } from 'types/reducer/globalTime';

import HostsEmptyOrIncorrectMetrics from './HostsEmptyOrIncorrectMetrics';
import HostsListControls from './HostsListControls';
import {
	formatDataForTable,
	getHostListsQuery,
	getHostsListColumns,
	HostRowData,
} from './utils';

// eslint-disable-next-line sonarjs/cognitive-complexity
function HostsList(): JSX.Element {
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const [currentPage, setCurrentPage] = useState(1);
	const [filters, setFilters] = useState<IBuilderQuery['filters']>({
		items: [],
		op: 'and',
	});

	const [orderBy, setOrderBy] = useState<{
		columnName: string;
		order: 'asc' | 'desc';
	} | null>(null);

	const [selectedHostName, setSelectedHostName] = useState<string | null>(null);

	const pageSize = 10;

	const query = useMemo(() => {
		const baseQuery = getHostListsQuery();
		return {
			...baseQuery,
			limit: pageSize,
			offset: (currentPage - 1) * pageSize,
			filters,
			start: Math.floor(minTime / 1000000),
			end: Math.floor(maxTime / 1000000),
			orderBy,
		};
	}, [currentPage, filters, minTime, maxTime, orderBy]);

	const { data, isFetching, isLoading, isError } = useGetHostList(
		query as HostListPayload,
		{
			queryKey: ['hostList', query],
			enabled: !!query,
		},
	);

	const sentAnyHostMetricsData = useMemo(
		() => data?.payload?.data?.sentAnyHostMetricsData || false,
		[data],
	);

	const isSendingIncorrectK8SAgentMetrics = useMemo(
		() => data?.payload?.data?.isSendingK8SAgentMetrics || false,
		[data],
	);

	const hostMetricsData = useMemo(() => data?.payload?.data?.records || [], [
		data,
	]);
	const totalCount = data?.payload?.data?.total || 0;

	const formattedHostMetricsData = useMemo(
		() => formatDataForTable(hostMetricsData),
		[hostMetricsData],
	);

	const columns = useMemo(() => getHostsListColumns(), []);

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
		[],
	);

	const handleFiltersChange = useCallback(
		(value: IBuilderQuery['filters']): void => {
			const isNewFilterAdded = value.items.length !== filters.items.length;
			if (isNewFilterAdded) {
				setFilters(value);
				setCurrentPage(1);

				logEvent('Infra Monitoring: Hosts list filters applied', {
					filters: value,
				});
			}
		},
		[filters],
	);

	useEffect(() => {
		logEvent('Infra Monitoring: Hosts list page visited', {});
	}, []);

	const selectedHostData = useMemo(() => {
		if (!selectedHostName) return null;
		return (
			hostMetricsData.find((host) => host.hostName === selectedHostName) || null
		);
	}, [selectedHostName, hostMetricsData]);

	const handleRowClick = (record: HostRowData): void => {
		setSelectedHostName(record.hostName);

		logEvent('Infra Monitoring: Hosts list item clicked', {
			host: record.hostName,
		});
	};

	const handleCloseHostDetail = (): void => {
		setSelectedHostName(null);
	};

	const showHostsTable =
		!isError &&
		sentAnyHostMetricsData &&
		!isSendingIncorrectK8SAgentMetrics &&
		!(formattedHostMetricsData.length === 0 && filters.items.length > 0);

	const showNoFilteredHostsMessage =
		!isFetching &&
		!isLoading &&
		formattedHostMetricsData.length === 0 &&
		filters.items.length > 0;

	const showHostsEmptyState =
		!isFetching &&
		!isLoading &&
		(!sentAnyHostMetricsData || isSendingIncorrectK8SAgentMetrics);

	return (
		<div className="hosts-list">
			<HostsListControls handleFiltersChange={handleFiltersChange} />
			{isError && <Typography>{data?.error || 'Something went wrong'}</Typography>}

			{showHostsEmptyState && (
				<HostsEmptyOrIncorrectMetrics
					noData={!sentAnyHostMetricsData}
					incorrectData={isSendingIncorrectK8SAgentMetrics}
				/>
			)}

			{showNoFilteredHostsMessage && (
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
			)}

			{(isFetching || isLoading) && (
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
			)}

			{showHostsTable && (
				<Table
					className="hosts-list-table"
					dataSource={isFetching || isLoading ? [] : formattedHostMetricsData}
					columns={columns}
					pagination={{
						current: currentPage,
						pageSize,
						total: totalCount,
						showSizeChanger: false,
						hideOnSinglePage: true,
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
			)}

			<HostMetricDetail
				host={selectedHostData}
				isModalTimeSelection
				onClose={handleCloseHostDetail}
			/>
		</div>
	);
}

export default HostsList;
