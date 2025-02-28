import './InfraMonitoring.styles.scss';

import { VerticalAlignTopOutlined } from '@ant-design/icons';
import { Button, Tooltip, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import { HostListPayload } from 'api/infraMonitoring/getHostLists';
import HostMetricDetail from 'components/HostMetricsDetail';
import QuickFilters from 'components/QuickFilters/QuickFilters';
import { QuickFiltersSource } from 'components/QuickFilters/types';
import { usePageSize } from 'container/InfraMonitoringK8s/utils';
import { useGetHostList } from 'hooks/infraMonitoring/useGetHostList';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import { Filter } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { IBuilderQuery, Query } from 'types/api/queryBuilder/queryBuilderData';
import { GlobalReducer } from 'types/reducer/globalTime';

import HostsListControls from './HostsListControls';
import HostsListTable from './HostsListTable';
import { getHostListsQuery, HostsQuickFiltersConfig } from './utils';

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
	const [showFilters, setShowFilters] = useState<boolean>(true);

	const [orderBy, setOrderBy] = useState<{
		columnName: string;
		order: 'asc' | 'desc';
	} | null>(null);

	const [selectedHostName, setSelectedHostName] = useState<string | null>(null);

	const { pageSize, setPageSize } = usePageSize('hosts');

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
	}, [pageSize, currentPage, filters, minTime, maxTime, orderBy]);

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

	const { currentQuery } = useQueryBuilder();

	const { handleChangeQueryData } = useQueryOperations({
		index: 0,
		query: currentQuery.builder.queryData[0],
		entityVersion: '',
	});

	const handleFiltersChange = useCallback(
		(value: IBuilderQuery['filters']): void => {
			const isNewFilterAdded = value.items.length !== filters.items.length;
			setFilters(value);
			handleChangeQueryData('filters', value);
			if (isNewFilterAdded) {
				setCurrentPage(1);

				logEvent('Infra Monitoring: Hosts list filters applied', {
					filters: value,
				});
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
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

	const handleCloseHostDetail = (): void => {
		setSelectedHostName(null);
	};

	const handleFilterVisibilityChange = (): void => {
		setShowFilters(!showFilters);
	};

	const handleQuickFiltersChange = (query: Query): void => {
		handleChangeQueryData('filters', query.builder.queryData[0].filters);
		handleFiltersChange(query.builder.queryData[0].filters);
	};

	return (
		<div className="hosts-list">
			<div className="hosts-list-content">
				{showFilters && (
					<div className="hosts-quick-filters-container">
						<div className="hosts-quick-filters-container-header">
							<Typography.Text>Filters</Typography.Text>
							<Tooltip title="Collapse Filters">
								<VerticalAlignTopOutlined
									rotate={270}
									onClick={handleFilterVisibilityChange}
								/>
							</Tooltip>
						</div>
						<QuickFilters
							source={QuickFiltersSource.INFRA_MONITORING}
							config={HostsQuickFiltersConfig}
							handleFilterVisibilityChange={handleFilterVisibilityChange}
							onFilterChange={handleQuickFiltersChange}
						/>
					</div>
				)}
				<div className="hosts-list-table-container">
					<div className="hosts-list-table-header">
						{!showFilters && (
							<div className="quick-filters-toggle-container">
								<Button
									className="periscope-btn ghost"
									type="text"
									size="small"
									onClick={handleFilterVisibilityChange}
								>
									<Filter size={14} />
								</Button>
							</div>
						)}
						<HostsListControls handleFiltersChange={handleFiltersChange} />
					</div>
					<HostsListTable
						isLoading={isLoading}
						isFetching={isFetching}
						isError={isError}
						tableData={data}
						hostMetricsData={hostMetricsData}
						filters={filters}
						currentPage={currentPage}
						setCurrentPage={setCurrentPage}
						setSelectedHostName={setSelectedHostName}
						pageSize={pageSize}
						setPageSize={setPageSize}
						setOrderBy={setOrderBy}
					/>
				</div>
			</div>
			<HostMetricDetail
				host={selectedHostData}
				isModalTimeSelection
				onClose={handleCloseHostDetail}
			/>
		</div>
	);
}

export default HostsList;
