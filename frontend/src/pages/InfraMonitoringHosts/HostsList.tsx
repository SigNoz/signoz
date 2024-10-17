import { Typography } from 'antd';
import { HostListPayload } from 'api/infraMonitoring/getHostLists';
import { ResizeTable } from 'components/ResizeTable';
import { LOCALSTORAGE } from 'constants/localStorage';
import { useOptionsMenu } from 'container/OptionsMenu';
import { useGetHostList } from 'hooks/infraMonitoring/useGetHostList';
import { useMemo } from 'react';
import { DataSource, StringOperators } from 'types/common/queryBuilder';

import HostsListControls from './HostsListControls';
// import { Container, ErrorText, tableStyles } from './styles';
import { getHostListsQuery, getHostsListColumns } from './utils';

interface HostsListProps {
	isFilterApplied: boolean;
}

function HostsList({ isFilterApplied }: HostsListProps): JSX.Element {
	const query = getHostListsQuery();
	const { data, isFetching, isLoading, isError } = useGetHostList(
		query as HostListPayload,
	);

	const { options } = useOptionsMenu({
		storageKey: LOCALSTORAGE.INFRAMONITORING_HOSTS_LIST_OPTIONS,
		dataSource: DataSource.METRICS,
		aggregateOperator: StringOperators.NOOP,
	});

	console.log(options);

	const hostsData = useMemo(() => data?.payload?.data?.records || [], [data]);

	const columns = useMemo(() => getHostsListColumns(), []);

	const isDataPresent =
		!isLoading && !isFetching && !isError && hostsData.length === 0;

	return (
		<div>
			<HostsListControls />
			{isError && <Typography>{data?.error || 'Something went wrong'}</Typography>}

			{isLoading && <div>Loading...</div>}

			{isDataPresent && !isFilterApplied && (
				<div>No hosts found. Try adjusting your query.</div>
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
					// style={tableStyles}
					dataSource={hostsData}
					columns={columns}
				/>
			)}
		</div>
	);
}

export default HostsList;
