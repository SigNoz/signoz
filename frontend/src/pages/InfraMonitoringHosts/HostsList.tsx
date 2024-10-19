import { Typography } from 'antd';
import { HostListPayload } from 'api/infraMonitoring/getHostLists';
import { ResizeTable } from 'components/ResizeTable';
import { HostMetricsLoading } from 'container/HostMetricsLoading/HostMetricsLoading';
import NoLogs from 'container/NoLogs/NoLogs';
import { useGetHostList } from 'hooks/infraMonitoring/useGetHostList';
import { useMemo } from 'react';
import { DataSource } from 'types/common/queryBuilder';

import HostsListControls from './HostsListControls';
import { getHostListsQuery, getHostsListColumns } from './utils';

interface HostsListProps {
	isFilterApplied: boolean;
}

function HostsList({ isFilterApplied }: HostsListProps): JSX.Element {
	const query = useMemo(() => getHostListsQuery(), []);
	const { data, isFetching, isLoading, isError } = useGetHostList(
		query as HostListPayload,
		{
			queryKey: ['hostList', query],
			enabled: !!query,
		},
	);

	const hostsData = useMemo(() => data?.payload?.data?.records || [], [data]);

	const columns = useMemo(() => getHostsListColumns(), []);

	const isDataPresent =
		!isLoading && !isFetching && !isError && hostsData.length === 0;

	return (
		<div>
			<HostsListControls />
			{isError && <Typography>{data?.error || 'Something went wrong'}</Typography>}

			{isLoading && <HostMetricsLoading />}

			{isDataPresent && !isFilterApplied && (
				<NoLogs dataSource={DataSource.METRICS} />
			)}

			{isDataPresent && isFilterApplied && (
				<div>No hosts match the applied filters.</div>
			)}

			{!isError && hostsData.length > 0 && (
				<ResizeTable
					tableLayout="fixed"
					pagination={false}
					scroll={{ x: true }}
					loading={isFetching}
					dataSource={hostsData}
					columns={columns}
				/>
			)}
		</div>
	);
}

export default HostsList;
