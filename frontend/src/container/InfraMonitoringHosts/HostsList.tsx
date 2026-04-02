import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { VerticalAlignTopOutlined } from '@ant-design/icons';
import { Button, Tooltip, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import {
	getHostLists,
	HostListPayload,
	HostListResponse,
} from 'api/infraMonitoring/getHostLists';
import HostMetricDetail from 'components/HostMetricsDetail';
import QuickFilters from 'components/QuickFilters/QuickFilters';
import { QuickFiltersSource } from 'components/QuickFilters/types';
import { InfraMonitoringEvents } from 'constants/events';
import { FeatureKeys } from 'constants/features';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import {
	useInfraMonitoringCurrentPage,
	useInfraMonitoringFiltersHosts,
	useInfraMonitoringOrderByHosts,
} from 'container/InfraMonitoringK8s/hooks';
import { usePageSize } from 'container/InfraMonitoringK8s/utils';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import { Filter } from 'lucide-react';
import { parseAsString, useQueryState } from 'nuqs';
import { useAppContext } from 'providers/App/App';
import { useGlobalTimeStore } from 'store/globalTime';
import {
	getAutoRefreshQueryKey,
	NANO_SECOND_MULTIPLIER,
} from 'store/globalTime/utils';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	IBuilderQuery,
	Query,
	TagFilter,
} from 'types/api/queryBuilder/queryBuilderData';

import HostsListControls from './HostsListControls';
import HostsListTable from './HostsListTable';
import { getHostListsQuery, GetHostsQuickFiltersConfig } from './utils';

import './InfraMonitoring.styles.scss';

const defaultFilters: TagFilter = { items: [], op: 'and' };
const baseQuery = getHostListsQuery();

function HostsList(): JSX.Element {
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

	const selectedTime = useGlobalTimeStore((s) => s.selectedTime);
	const isRefreshEnabled = useGlobalTimeStore((s) => s.isRefreshEnabled);
	const refreshInterval = useGlobalTimeStore((s) => s.refreshInterval);
	const getMinMaxTime = useGlobalTimeStore((s) => s.getMinMaxTime);

	const queryKey = useMemo(
		() =>
			getAutoRefreshQueryKey(
				selectedTime,
				REACT_QUERY_KEY.GET_HOST_LIST,
				String(pageSize),
				String(currentPage),
				JSON.stringify(filters),
				JSON.stringify(orderBy),
			),
		[pageSize, currentPage, filters, orderBy, selectedTime],
	);

	const { data, isFetching, isLoading, isError } = useQuery<
		SuccessResponse<HostListResponse> | ErrorResponse,
		Error
	>({
		queryKey,
		queryFn: ({ signal }) => {
			const { minTime, maxTime } = getMinMaxTime();

			const payload: HostListPayload = {
				...baseQuery,
				limit: pageSize,
				offset: (currentPage - 1) * pageSize,
				filters: filters ?? defaultFilters,
				orderBy,
				start: Math.floor(minTime / NANO_SECOND_MULTIPLIER),
				end: Math.floor(maxTime / NANO_SECOND_MULTIPLIER),
			};

			return getHostLists(payload, signal);
		},
		enabled: true,
		keepPreviousData: true,
		refetchInterval: isRefreshEnabled ? refreshInterval : false,
	});

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
						filters={filters ?? defaultFilters}
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
