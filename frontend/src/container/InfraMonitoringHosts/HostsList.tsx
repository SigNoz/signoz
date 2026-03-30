import { useCallback, useEffect, useMemo, useState } from 'react';
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import { VerticalAlignTopOutlined } from '@ant-design/icons';
import { Button, Tooltip, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import { HostListPayload } from 'api/infraMonitoring/getHostLists';
import HostMetricDetail from 'components/HostMetricsDetail';
import QuickFilters from 'components/QuickFilters/QuickFilters';
import { QuickFiltersSource } from 'components/QuickFilters/types';
import { InfraMonitoringEvents } from 'constants/events';
import {
	useInfraMonitoringCurrentPage,
	useInfraMonitoringFiltersHosts,
	useInfraMonitoringOrderByHosts,
} from 'container/InfraMonitoringK8s/hooks';
import { usePageSize } from 'container/InfraMonitoringK8s/utils';
import { useGetHostList } from 'hooks/infraMonitoring/useGetHostList';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import { Filter } from 'lucide-react';
import { parseAsString, useQueryState } from 'nuqs';
import { AppState } from 'store/reducers';
import { IBuilderQuery, Query } from 'types/api/queryBuilder/queryBuilderData';
import { GlobalReducer } from 'types/reducer/globalTime';

import { FeatureKeys } from '../../constants/features';
import { useAppContext } from '../../providers/App/App';
import HostsListControls from './HostsListControls';
import HostsListTable from './HostsListTable';
import { getHostListsQuery, GetHostsQuickFiltersConfig } from './utils';

import './InfraMonitoring.styles.scss';
function HostsList(): JSX.Element {
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const [currentPage, setCurrentPage] = useInfraMonitoringCurrentPage();
	const [filters, setFilters] = useInfraMonitoringFiltersHosts();
	const [orderBy, setOrderBy] = useInfraMonitoringOrderByHosts();

	const [showFilters, setShowFilters] = useState<boolean>(true);

	const [selectedHostName, setSelectedHostName] = useQueryState(
		'hostName',
		parseAsString.withDefault(''),
	);

	const handleOrderByChange = (
		orderByValue: {
			columnName: string;
			order: 'asc' | 'desc';
		} | null,
	): void => {
		setOrderBy(orderByValue);
	};

	const handleHostClick = (hostName: string): void => {
		setSelectedHostName(hostName);
	};

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

	const queryKey = useMemo(() => {
		if (selectedHostName) {
			return [
				'hostList',
				String(pageSize),
				String(currentPage),
				JSON.stringify(filters),
				JSON.stringify(orderBy),
			];
		}
		return [
			'hostList',
			String(pageSize),
			String(currentPage),
			JSON.stringify(filters),
			JSON.stringify(orderBy),
			String(minTime),
			String(maxTime),
		];
	}, [
		pageSize,
		currentPage,
		filters,
		orderBy,
		selectedHostName,
		minTime,
		maxTime,
	]);

	const { data, isFetching, isLoading, isError } = useGetHostList(
		query as HostListPayload,
		{
			queryKey,
			enabled: !!query,
			keepPreviousData: true,
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

	const { featureFlags } = useAppContext();
	const dotMetricsEnabled =
		featureFlags?.find((flag) => flag.name === FeatureKeys.DOT_METRICS_ENABLED)
			?.active || false;

	const handleFiltersChange = useCallback(
		(value: IBuilderQuery['filters']): void => {
			const isNewFilterAdded = value?.items?.length !== filters?.items?.length;
			setFilters(value ?? null);
			handleChangeQueryData('filters', value);
			if (isNewFilterAdded) {
				setCurrentPage(1);

				if (value?.items && value?.items?.length > 0) {
					logEvent(InfraMonitoringEvents.FilterApplied, {
						entity: InfraMonitoringEvents.HostEntity,
						page: InfraMonitoringEvents.ListPage,
					});
				}
			}
		},
		[filters, setFilters, setCurrentPage, handleChangeQueryData],
	);

	useEffect(() => {
		logEvent(InfraMonitoringEvents.PageVisited, {
			total: data?.payload?.data?.total,
			entity: InfraMonitoringEvents.HostEntity,
			page: InfraMonitoringEvents.ListPage,
		});
	}, [data?.payload?.data?.total]);

	const selectedHostData = useMemo(() => {
		if (!selectedHostName?.trim()) {
			return null;
		}
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
							config={GetHostsQuickFiltersConfig(dotMetricsEnabled)}
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
						<HostsListControls
							filters={filters}
							handleFiltersChange={handleFiltersChange}
							showAutoRefresh={!selectedHostData}
						/>
					</div>
					<HostsListTable
						isLoading={isLoading}
						isFetching={isFetching}
						isError={isError}
						tableData={data}
						hostMetricsData={hostMetricsData}
						filters={filters || { items: [], op: 'AND' }}
						currentPage={currentPage}
						setCurrentPage={setCurrentPage}
						onHostClick={handleHostClick}
						pageSize={pageSize}
						setPageSize={setPageSize}
						setOrderBy={handleOrderByChange}
						orderBy={orderBy}
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
