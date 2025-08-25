/* eslint-disable sonarjs/no-identical-functions */
import '../../EntityDetailsUtils/entityDetails.styles.scss';

import { Color, Spacing } from '@signozhq/design-tokens';
import { Button, Divider, Drawer, Radio, Tooltip, Typography } from 'antd';
import { RadioChangeEvent } from 'antd/lib';
import logEvent from 'api/common/logEvent';
import { K8sClustersData } from 'api/infraMonitoring/getK8sClustersList';
import { VIEW_TYPES, VIEWS } from 'components/HostMetricsDetail/constants';
import { InfraMonitoringEvents } from 'constants/events';
import { QueryParams } from 'constants/query';
import {
	initialQueryBuilderFormValuesMap,
	initialQueryState,
} from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import {
	filterDuplicateFilters,
	getFiltersFromParams,
} from 'container/InfraMonitoringK8s/commonUtils';
import {
	INFRA_MONITORING_K8S_PARAMS_KEYS,
	K8sCategory,
} from 'container/InfraMonitoringK8s/constants';
import { QUERY_KEYS } from 'container/InfraMonitoringK8s/EntityDetailsUtils/utils';
import {
	CustomTimeType,
	Time,
} from 'container/TopNav/DateTimeSelectionV2/config';
import { useIsDarkMode } from 'hooks/useDarkMode';
import useUrlQuery from 'hooks/useUrlQuery';
import GetMinMax from 'lib/getMinMax';
import {
	BarChart2,
	ChevronsLeftRight,
	Compass,
	DraftingCompass,
	ScrollText,
	X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom-v5-compat';
import { AppState } from 'store/reducers';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	IBuilderQuery,
	TagFilterItem,
} from 'types/api/queryBuilder/queryBuilderData';
import {
	LogsAggregatorOperator,
	TracesAggregatorOperator,
} from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';
import { v4 as uuidv4 } from 'uuid';

import ClusterEvents from '../../EntityDetailsUtils/EntityEvents';
import ClusterLogs from '../../EntityDetailsUtils/EntityLogs';
import ClusterMetrics from '../../EntityDetailsUtils/EntityMetrics';
import ClusterTraces from '../../EntityDetailsUtils/EntityTraces';
import { ClusterDetailsProps } from './ClusterDetails.interfaces';
import { clusterWidgetInfo, getClusterMetricsQueryPayload } from './constants';

function ClusterDetails({
	cluster,
	onClose,
	isModalTimeSelection,
}: ClusterDetailsProps): JSX.Element {
	const { maxTime, minTime, selectedTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const startMs = useMemo(() => Math.floor(Number(minTime) / 1000000000), [
		minTime,
	]);
	const endMs = useMemo(() => Math.floor(Number(maxTime) / 1000000000), [
		maxTime,
	]);

	const urlQuery = useUrlQuery();

	const [modalTimeRange, setModalTimeRange] = useState(() => ({
		startTime: startMs,
		endTime: endMs,
	}));

	const lastSelectedInterval = useRef<Time | null>(null);

	const [selectedInterval, setSelectedInterval] = useState<Time>(
		lastSelectedInterval.current
			? lastSelectedInterval.current
			: (selectedTime as Time),
	);

	const [searchParams, setSearchParams] = useSearchParams();
	const [selectedView, setSelectedView] = useState<VIEWS>(() => {
		const view = searchParams.get(INFRA_MONITORING_K8S_PARAMS_KEYS.VIEW);
		if (view) {
			return view as VIEWS;
		}
		return VIEWS.METRICS;
	});
	const isDarkMode = useIsDarkMode();

	const initialFilters = useMemo(() => {
		const urlView = searchParams.get(INFRA_MONITORING_K8S_PARAMS_KEYS.VIEW);
		const queryKey =
			urlView === VIEW_TYPES.LOGS
				? INFRA_MONITORING_K8S_PARAMS_KEYS.LOG_FILTERS
				: INFRA_MONITORING_K8S_PARAMS_KEYS.TRACES_FILTERS;
		const filters = getFiltersFromParams(searchParams, queryKey);
		if (filters) {
			return filters;
		}
		return {
			op: 'AND',
			items: [
				{
					id: uuidv4(),
					key: {
						key: QUERY_KEYS.K8S_CLUSTER_NAME,
						dataType: DataTypes.String,
						type: 'resource',
						id: 'k8s_cluster_name--string--resource--false',
					},
					op: '=',
					value: cluster?.meta.k8s_cluster_name || '',
				},
			],
		};
	}, [cluster?.meta.k8s_cluster_name, searchParams]);

	const initialEventsFilters = useMemo(() => {
		const filters = getFiltersFromParams(
			searchParams,
			INFRA_MONITORING_K8S_PARAMS_KEYS.EVENTS_FILTERS,
		);
		if (filters) {
			return filters;
		}
		return {
			op: 'AND',
			items: [
				{
					id: uuidv4(),
					key: {
						key: QUERY_KEYS.K8S_OBJECT_KIND,
						dataType: DataTypes.String,
						type: 'resource',
						id: 'k8s.object.kind--string--resource--false',
					},
					op: '=',
					value: 'Cluster',
				},
				{
					id: uuidv4(),
					key: {
						key: QUERY_KEYS.K8S_OBJECT_NAME,
						dataType: DataTypes.String,
						type: 'resource',
						id: 'k8s.object.name--string--resource--false',
					},
					op: '=',
					value: cluster?.meta.k8s_cluster_name || '',
				},
			],
		};
	}, [cluster?.meta.k8s_cluster_name, searchParams]);

	const [logsAndTracesFilters, setLogsAndTracesFilters] = useState<
		IBuilderQuery['filters']
	>(initialFilters);

	const [eventsFilters, setEventsFilters] = useState<IBuilderQuery['filters']>(
		initialEventsFilters,
	);

	useEffect(() => {
		if (cluster) {
			logEvent(InfraMonitoringEvents.PageVisited, {
				entity: InfraMonitoringEvents.K8sEntity,
				page: InfraMonitoringEvents.DetailedPage,
				category: InfraMonitoringEvents.Cluster,
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [cluster]);

	useEffect(() => {
		setLogsAndTracesFilters(initialFilters);
		setEventsFilters(initialEventsFilters);
	}, [initialFilters, initialEventsFilters]);

	useEffect(() => {
		const currentSelectedInterval = lastSelectedInterval.current || selectedTime;
		setSelectedInterval(currentSelectedInterval as Time);

		if (currentSelectedInterval !== 'custom') {
			const { maxTime, minTime } = GetMinMax(currentSelectedInterval);

			setModalTimeRange({
				startTime: Math.floor(minTime / 1000000000),
				endTime: Math.floor(maxTime / 1000000000),
			});
		}
	}, [selectedTime, minTime, maxTime]);

	const handleTabChange = (e: RadioChangeEvent): void => {
		setSelectedView(e.target.value);
		setSearchParams({
			...Object.fromEntries(searchParams.entries()),
			[INFRA_MONITORING_K8S_PARAMS_KEYS.VIEW]: e.target.value,
			[INFRA_MONITORING_K8S_PARAMS_KEYS.LOG_FILTERS]: JSON.stringify(null),
			[INFRA_MONITORING_K8S_PARAMS_KEYS.TRACES_FILTERS]: JSON.stringify(null),
			[INFRA_MONITORING_K8S_PARAMS_KEYS.EVENTS_FILTERS]: JSON.stringify(null),
		});
		logEvent(InfraMonitoringEvents.TabChanged, {
			entity: InfraMonitoringEvents.K8sEntity,
			page: InfraMonitoringEvents.DetailedPage,
			category: InfraMonitoringEvents.Cluster,
			view: e.target.value,
		});
	};

	const handleTimeChange = useCallback(
		(interval: Time | CustomTimeType, dateTimeRange?: [number, number]): void => {
			lastSelectedInterval.current = interval as Time;
			setSelectedInterval(interval as Time);

			if (interval === 'custom' && dateTimeRange) {
				setModalTimeRange({
					startTime: Math.floor(dateTimeRange[0] / 1000),
					endTime: Math.floor(dateTimeRange[1] / 1000),
				});
			} else {
				const { maxTime, minTime } = GetMinMax(interval);

				setModalTimeRange({
					startTime: Math.floor(minTime / 1000000000),
					endTime: Math.floor(maxTime / 1000000000),
				});
			}

			logEvent(InfraMonitoringEvents.TimeUpdated, {
				entity: InfraMonitoringEvents.K8sEntity,
				page: InfraMonitoringEvents.DetailedPage,
				category: InfraMonitoringEvents.Cluster,
				interval,
				view: selectedView,
			});
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);

	const handleChangeLogFilters = useCallback(
		(value: IBuilderQuery['filters'], view: VIEWS) => {
			setLogsAndTracesFilters((prevFilters) => {
				const primaryFilters = prevFilters?.items?.filter((item) =>
					[QUERY_KEYS.K8S_CLUSTER_NAME].includes(item.key?.key ?? ''),
				);
				const paginationFilter = value?.items?.find(
					(item) => item.key?.key === 'id',
				);
				const newFilters = value?.items?.filter(
					(item) =>
						item.key?.key !== 'id' && item.key?.key !== QUERY_KEYS.K8S_CLUSTER_NAME,
				);

				if (newFilters && newFilters?.length > 0) {
					logEvent(InfraMonitoringEvents.FilterApplied, {
						entity: InfraMonitoringEvents.K8sEntity,
						page: InfraMonitoringEvents.DetailedPage,
						view: InfraMonitoringEvents.LogsView,
						category: InfraMonitoringEvents.Cluster,
					});
				}

				const updatedFilters = {
					op: 'AND',
					items: filterDuplicateFilters(
						[
							...(primaryFilters || []),
							...(newFilters || []),
							...(paginationFilter ? [paginationFilter] : []),
						].filter((item): item is TagFilterItem => item !== undefined),
					),
				};

				setSearchParams({
					...Object.fromEntries(searchParams.entries()),
					[INFRA_MONITORING_K8S_PARAMS_KEYS.LOG_FILTERS]: JSON.stringify(
						updatedFilters,
					),
					[INFRA_MONITORING_K8S_PARAMS_KEYS.VIEW]: view,
				});

				return updatedFilters;
			});
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);

	const handleChangeTracesFilters = useCallback(
		(value: IBuilderQuery['filters'], view: VIEWS) => {
			setLogsAndTracesFilters((prevFilters) => {
				const primaryFilters = prevFilters?.items?.filter((item) =>
					[QUERY_KEYS.K8S_CLUSTER_NAME].includes(item.key?.key ?? ''),
				);

				if (value?.items && value?.items?.length > 0) {
					logEvent(InfraMonitoringEvents.FilterApplied, {
						entity: InfraMonitoringEvents.K8sEntity,
						page: InfraMonitoringEvents.DetailedPage,
						view: InfraMonitoringEvents.TracesView,
						category: InfraMonitoringEvents.Cluster,
					});
				}

				const updatedFilters = {
					op: 'AND',
					items: filterDuplicateFilters(
						[
							...(primaryFilters || []),
							...(value?.items?.filter(
								(item) => item.key?.key !== QUERY_KEYS.K8S_CLUSTER_NAME,
							) || []),
						].filter((item): item is TagFilterItem => item !== undefined),
					),
				};

				setSearchParams({
					...Object.fromEntries(searchParams.entries()),
					[INFRA_MONITORING_K8S_PARAMS_KEYS.TRACES_FILTERS]: JSON.stringify(
						updatedFilters,
					),
					[INFRA_MONITORING_K8S_PARAMS_KEYS.VIEW]: view,
				});

				return updatedFilters;
			});
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);

	const handleChangeEventsFilters = useCallback(
		(value: IBuilderQuery['filters'], view: VIEWS) => {
			setEventsFilters((prevFilters) => {
				const clusterKindFilter = prevFilters?.items?.find(
					(item) => item.key?.key === QUERY_KEYS.K8S_OBJECT_KIND,
				);
				const clusterNameFilter = prevFilters?.items?.find(
					(item) => item.key?.key === QUERY_KEYS.K8S_OBJECT_NAME,
				);

				if (value?.items && value?.items?.length > 0) {
					logEvent(InfraMonitoringEvents.FilterApplied, {
						entity: InfraMonitoringEvents.K8sEntity,
						page: InfraMonitoringEvents.DetailedPage,
						view: InfraMonitoringEvents.EventsView,
						category: InfraMonitoringEvents.Cluster,
					});
				}

				const updatedFilters = {
					op: 'AND',
					items: filterDuplicateFilters(
						[
							clusterKindFilter,
							clusterNameFilter,
							...(value?.items?.filter(
								(item) =>
									item.key?.key !== QUERY_KEYS.K8S_OBJECT_KIND &&
									item.key?.key !== QUERY_KEYS.K8S_OBJECT_NAME,
							) || []),
						].filter((item): item is TagFilterItem => item !== undefined),
					),
				};

				setSearchParams({
					...Object.fromEntries(searchParams.entries()),
					[INFRA_MONITORING_K8S_PARAMS_KEYS.EVENTS_FILTERS]: JSON.stringify(
						updatedFilters,
					),
					[INFRA_MONITORING_K8S_PARAMS_KEYS.VIEW]: view,
				});

				return updatedFilters;
			});
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);

	const handleExplorePagesRedirect = (): void => {
		if (selectedInterval !== 'custom') {
			urlQuery.set(QueryParams.relativeTime, selectedInterval);
		} else {
			urlQuery.delete(QueryParams.relativeTime);
			urlQuery.set(QueryParams.startTime, modalTimeRange.startTime.toString());
			urlQuery.set(QueryParams.endTime, modalTimeRange.endTime.toString());
		}

		logEvent(InfraMonitoringEvents.ExploreClicked, {
			entity: InfraMonitoringEvents.K8sEntity,
			page: InfraMonitoringEvents.DetailedPage,
			category: InfraMonitoringEvents.Cluster,
			view: selectedView,
		});

		if (selectedView === VIEW_TYPES.LOGS) {
			const filtersWithoutPagination = {
				...logsAndTracesFilters,
				items:
					logsAndTracesFilters?.items?.filter((item) => item.key?.key !== 'id') ||
					[],
			};

			const compositeQuery = {
				...initialQueryState,
				queryType: 'builder',
				builder: {
					...initialQueryState.builder,
					queryData: [
						{
							...initialQueryBuilderFormValuesMap.logs,
							aggregateOperator: LogsAggregatorOperator.NOOP,
							filters: filtersWithoutPagination,
						},
					],
				},
			};

			urlQuery.set('compositeQuery', JSON.stringify(compositeQuery));

			window.open(
				`${window.location.origin}${ROUTES.LOGS_EXPLORER}?${urlQuery.toString()}`,
				'_blank',
			);
		} else if (selectedView === VIEW_TYPES.TRACES) {
			const compositeQuery = {
				...initialQueryState,
				queryType: 'builder',
				builder: {
					...initialQueryState.builder,
					queryData: [
						{
							...initialQueryBuilderFormValuesMap.traces,
							aggregateOperator: TracesAggregatorOperator.NOOP,
							filters: logsAndTracesFilters,
						},
					],
				},
			};

			urlQuery.set('compositeQuery', JSON.stringify(compositeQuery));

			window.open(
				`${window.location.origin}${ROUTES.TRACES_EXPLORER}?${urlQuery.toString()}`,
				'_blank',
			);
		}
	};

	const handleClose = (): void => {
		lastSelectedInterval.current = null;
		setSelectedInterval(selectedTime as Time);

		if (selectedTime !== 'custom') {
			const { maxTime, minTime } = GetMinMax(selectedTime);

			setModalTimeRange({
				startTime: Math.floor(minTime / 1000000000),
				endTime: Math.floor(maxTime / 1000000000),
			});
		}
		setSelectedView(VIEW_TYPES.METRICS);
		onClose();
	};

	return (
		<Drawer
			width="70%"
			title={
				<>
					<Divider type="vertical" />
					<Typography.Text className="title">
						{cluster?.meta.k8s_cluster_name}
					</Typography.Text>
				</>
			}
			placement="right"
			onClose={handleClose}
			open={!!cluster}
			style={{
				overscrollBehavior: 'contain',
				background: isDarkMode ? Color.BG_INK_400 : Color.BG_VANILLA_100,
			}}
			className="entity-detail-drawer"
			destroyOnClose
			closeIcon={<X size={16} style={{ marginTop: Spacing.MARGIN_1 }} />}
		>
			{cluster && (
				<>
					<div className="entity-detail-drawer__entity">
						<div className="entity-details-grid">
							<div className="labels-row">
								<Typography.Text
									type="secondary"
									className="entity-details-metadata-label"
								>
									Cluster Name
								</Typography.Text>
							</div>
							<div className="values-row">
								<Typography.Text className="entity-details-metadata-value">
									<Tooltip title={cluster.meta.k8s_cluster_name}>
										{cluster.meta.k8s_cluster_name}
									</Tooltip>
								</Typography.Text>
							</div>
						</div>
					</div>

					<div className="views-tabs-container">
						<Radio.Group
							className="views-tabs"
							onChange={handleTabChange}
							value={selectedView}
						>
							<Radio.Button
								className={
									// eslint-disable-next-line sonarjs/no-duplicate-string
									selectedView === VIEW_TYPES.METRICS ? 'selected_view tab' : 'tab'
								}
								value={VIEW_TYPES.METRICS}
							>
								<div className="view-title">
									<BarChart2 size={14} />
									Metrics
								</div>
							</Radio.Button>
							<Radio.Button
								className={
									selectedView === VIEW_TYPES.LOGS ? 'selected_view tab' : 'tab'
								}
								value={VIEW_TYPES.LOGS}
							>
								<div className="view-title">
									<ScrollText size={14} />
									Logs
								</div>
							</Radio.Button>
							<Radio.Button
								className={
									selectedView === VIEW_TYPES.TRACES ? 'selected_view tab' : 'tab'
								}
								value={VIEW_TYPES.TRACES}
							>
								<div className="view-title">
									<DraftingCompass size={14} />
									Traces
								</div>
							</Radio.Button>
							<Radio.Button
								className={
									selectedView === VIEW_TYPES.EVENTS ? 'selected_view tab' : 'tab'
								}
								value={VIEW_TYPES.EVENTS}
							>
								<div className="view-title">
									<ChevronsLeftRight size={14} />
									Events
								</div>
							</Radio.Button>
						</Radio.Group>

						{(selectedView === VIEW_TYPES.LOGS ||
							selectedView === VIEW_TYPES.TRACES) && (
							<Button
								icon={<Compass size={18} />}
								className="compass-button"
								onClick={handleExplorePagesRedirect}
							/>
						)}
					</div>
					{selectedView === VIEW_TYPES.METRICS && (
						<ClusterMetrics<K8sClustersData>
							timeRange={modalTimeRange}
							isModalTimeSelection={isModalTimeSelection}
							handleTimeChange={handleTimeChange}
							selectedInterval={selectedInterval}
							entity={cluster}
							entityWidgetInfo={clusterWidgetInfo}
							getEntityQueryPayload={getClusterMetricsQueryPayload}
							category={K8sCategory.CLUSTERS}
							queryKey="clusterMetrics"
						/>
					)}
					{selectedView === VIEW_TYPES.LOGS && (
						<ClusterLogs
							timeRange={modalTimeRange}
							isModalTimeSelection={isModalTimeSelection}
							handleTimeChange={handleTimeChange}
							handleChangeLogFilters={handleChangeLogFilters}
							logFilters={logsAndTracesFilters}
							selectedInterval={selectedInterval}
							queryKey="clusterLogs"
							category={K8sCategory.CLUSTERS}
							queryKeyFilters={[QUERY_KEYS.K8S_CLUSTER_NAME]}
						/>
					)}
					{selectedView === VIEW_TYPES.TRACES && (
						<ClusterTraces
							timeRange={modalTimeRange}
							isModalTimeSelection={isModalTimeSelection}
							handleTimeChange={handleTimeChange}
							handleChangeTracesFilters={handleChangeTracesFilters}
							tracesFilters={logsAndTracesFilters}
							selectedInterval={selectedInterval}
							queryKey="clusterTraces"
							category={InfraMonitoringEvents.Cluster}
							queryKeyFilters={[QUERY_KEYS.K8S_CLUSTER_NAME]}
						/>
					)}
					{selectedView === VIEW_TYPES.EVENTS && (
						<ClusterEvents
							timeRange={modalTimeRange}
							handleChangeEventFilters={handleChangeEventsFilters}
							filters={eventsFilters}
							isModalTimeSelection={isModalTimeSelection}
							handleTimeChange={handleTimeChange}
							selectedInterval={selectedInterval}
							category={K8sCategory.CLUSTERS}
							queryKey="clusterEvents"
						/>
					)}
				</>
			)}
		</Drawer>
	);
}

export default ClusterDetails;
