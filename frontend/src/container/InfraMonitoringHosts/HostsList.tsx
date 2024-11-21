import './InfraMonitoring.styles.scss';

import { LoadingOutlined } from '@ant-design/icons';
import {
	Spin,
	Table,
	TablePaginationConfig,
	TableProps,
	Typography,
} from 'antd';
import { SorterResult } from 'antd/es/table/interface';
import { HostListPayload } from 'api/infraMonitoring/getHostLists';
import HostMetricDetail from 'components/HostMetricsDetail';
import NoLogs from 'container/NoLogs/NoLogs';
import { useGetHostList } from 'hooks/infraMonitoring/useGetHostList';
import { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';

import HostsListControls from './HostsListControls';
import {
	formatDataForTable,
	getHostListsQuery,
	getHostsListColumns,
	HostRowData,
} from './utils';

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

	const hostMetricsData = useMemo(() => data?.payload?.data?.records || [], [
		data,
	]);
	const totalCount = data?.payload?.data?.total || 0;

	const formattedHostMetricsData = useMemo(
		() => formatDataForTable(hostMetricsData),
		[hostMetricsData],
	);

	const columns = useMemo(() => getHostsListColumns(), []);

	const isDataPresent =
		!isLoading && !isFetching && !isError && hostMetricsData.length === 0;

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
			}
		},
		[filters],
	);

	const selectedHostData = useMemo(() => {
		if (!selectedHostName) return null;
		return (
			hostMetricsData.find((host) => host.hostName === selectedHostName) || null
		);
	}, [selectedHostName, hostMetricsData]);

	const handleRowClick = (record: HostRowData): void => {
		setSelectedHostName(record.hostName);
	};

	const handleCloseHostDetail = (): void => {
		setSelectedHostName(null);
	};

	return (
		<div className="hosts-list">
			<HostsListControls handleFiltersChange={handleFiltersChange} />
			{isError && <Typography>{data?.error || 'Something went wrong'}</Typography>}

			{isDataPresent && filters.items.length === 0 && (
				<NoLogs dataSource={DataSource.METRICS} />
			)}

			{!isFetching &&
				!isLoading &&
				formattedHostMetricsData.length === 0 &&
				filters.items.length > 0 && (
					<div className="no-hosts-message">No hosts match the applied filters.</div>
				)}

			{!isError && (
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
