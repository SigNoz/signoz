import { Table, Typography } from 'antd';
import { HostListPayload } from 'api/infraMonitoring/getHostLists';
import { HostMetricsLoading } from 'container/HostMetricsLoading/HostMetricsLoading';
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
		};
	}, [currentPage, filters, minTime, maxTime]);

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

	const handleTableChange = (pagination: any): void => {
		if (pagination.current) {
			setCurrentPage(pagination.current);
		}
	};

	const handleFiltersChange = useCallback(
		(value: IBuilderQuery['filters']): void => {
			setFilters(value);
		},
		[setFilters],
	);

	return (
		<div>
			<HostsListControls handleFiltersChange={handleFiltersChange} />
			{isError && <Typography>{data?.error || 'Something went wrong'}</Typography>}

			{isLoading && <HostMetricsLoading />}

			{isDataPresent && filters.items.length === 0 && (
				<NoLogs dataSource={DataSource.METRICS} />
			)}

			{isDataPresent && filters.items.length > 0 && (
				<div>No hosts match the applied filters.</div>
			)}

			{!isError && formattedHostMetricsData.length > 0 && (
				<Table
					dataSource={formattedHostMetricsData}
					columns={columns}
					pagination={{
						current: currentPage,
						pageSize,
						total: totalCount,
						showSizeChanger: false,
						hideOnSinglePage: true,
					}}
					scroll={{ x: true }}
					loading={isFetching}
					tableLayout="fixed"
					rowKey={(record): string => record.hostName}
					onChange={handleTableChange}
				/>
			)}
		</div>
	);
}

export default HostsList;
