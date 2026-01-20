import './InfraMonitoring.styles.scss';

import { VerticalAlignTopOutlined } from '@ant-design/icons';
import { Button, Tooltip, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import { HostListPayload } from 'api/infraMonitoring/getHostLists';
import HostMetricDetail from 'components/HostMetricsDetail';
import QuickFilters from 'components/QuickFilters/QuickFilters';
import { QuickFiltersSource } from 'components/QuickFilters/types';
import { InfraMonitoringEvents } from 'constants/events';
import {
	getFiltersFromParams,
	getOrderByFromParams,
} from 'container/InfraMonitoringK8s/commonUtils';
import { INFRA_MONITORING_K8S_PARAMS_KEYS } from 'container/InfraMonitoringK8s/constants';
import { usePageSize } from 'container/InfraMonitoringK8s/utils';
import { useGetHostList } from 'hooks/infraMonitoring/useGetHostList';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useQueryOperations } from 'hooks/queryBuilder/useQueryBuilderOperations';
import { Filter } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom-v5-compat';
import { AppState } from 'store/reducers';
import { IBuilderQuery, Query } from 'types/api/queryBuilder/queryBuilderData';
import { GlobalReducer } from 'types/reducer/globalTime';

import { FeatureKeys } from '../../constants/features';
import { useAppContext } from '../../providers/App/App';
import HostsListControls from './HostsListControls';
import HostsListTable from './HostsListTable';
import { getHostListsQuery, GetHostsQuickFiltersConfig } from './utils';
// eslint-disable-next-line sonarjs/cognitive-complexity
function HostsList(): JSX.Element {
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const [searchParams, setSearchParams] = useSearchParams();

	const [currentPage, setCurrentPage] = useState(1);
	const [filters, setFilters] = useState<IBuilderQuery['filters']>(() => {
		const filters = getFiltersFromParams(
			searchParams,
			INFRA_MONITORING_K8S_PARAMS_KEYS.FILTERS,
		);
		if (!filters) {
			return {
				items: [],
				op: 'and',
			};
		}
		return filters;
	});
	const [showFilters, setShowFilters] = useState<boolean>(true);

	const [orderBy, setOrderBy] = useState<{
		columnName: string;
		order: 'asc' | 'desc';
	} | null>(() => getOrderByFromParams(searchParams));

	const handleOrderByChange = (
		orderBy: {
			columnName: string;
			order: 'asc' | 'desc';
		} | null,
	): void => {
		setOrderBy(orderBy);
		setSearchParams({
			...Object.fromEntries(searchParams.entries()),
			[INFRA_MONITORING_K8S_PARAMS_KEYS.ORDER_BY]: JSON.stringify(orderBy),
		});
	};

	const [selectedHostName, setSelectedHostName] = useState<string | null>(() => {
		const hostName = searchParams.get('hostName');
		return hostName || null;
	});

	const handleHostClick = (hostName: string): void => {
		setSelectedHostName(hostName);
		setSearchParams({ ...searchParams, hostName });
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
			setFilters(value);
			handleChangeQueryData('filters', value);
			setSearchParams({
				...Object.fromEntries(searchParams.entries()),
				[INFRA_MONITORING_K8S_PARAMS_KEYS.FILTERS]: JSON.stringify(value),
			});
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
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[filters],
	);

	useEffect(() => {
		logEvent(InfraMonitoringEvents.PageVisited, {
			total: data?.payload?.data?.total,
			entity: InfraMonitoringEvents.HostEntity,
			page: InfraMonitoringEvents.ListPage,
		});
	}, [data?.payload?.data?.total]);

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
