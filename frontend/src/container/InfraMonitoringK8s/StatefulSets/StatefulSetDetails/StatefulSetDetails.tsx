/* eslint-disable sonarjs/no-identical-functions */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// eslint-disable-next-line no-restricted-imports
import { useSelector } from 'react-redux';
import { Color, Spacing } from '@signozhq/design-tokens';
import { Button, Divider, Drawer, Radio, Tooltip, Typography } from 'antd';
import type { RadioChangeEvent } from 'antd/lib';
import logEvent from 'api/common/logEvent';
import { VIEW_TYPES, VIEWS } from 'components/HostMetricsDetail/constants';
import { InfraMonitoringEvents } from 'constants/events';
import { QueryParams } from 'constants/query';
import {
	initialQueryBuilderFormValuesMap,
	initialQueryState,
} from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { filterDuplicateFilters } from 'container/InfraMonitoringK8s/commonUtils';
import { K8sCategory } from 'container/InfraMonitoringK8s/constants';
import EntityEvents from 'container/InfraMonitoringK8s/EntityDetailsUtils/EntityEvents';
import EntityLogs from 'container/InfraMonitoringK8s/EntityDetailsUtils/EntityLogs';
import EntityMetrics from 'container/InfraMonitoringK8s/EntityDetailsUtils/EntityMetrics';
import EntityTraces from 'container/InfraMonitoringK8s/EntityDetailsUtils/EntityTraces';
import { QUERY_KEYS } from 'container/InfraMonitoringK8s/EntityDetailsUtils/utils';
import {
	useInfraMonitoringEventsFilters,
	useInfraMonitoringLogFilters,
	useInfraMonitoringTracesFilters,
	useInfraMonitoringView,
} from 'container/InfraMonitoringK8s/hooks';
import {
	CustomTimeType,
	Time,
} from 'container/TopNav/DateTimeSelectionV2/types';
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
import { openInNewTab } from 'utils/navigation';
import { v4 as uuidv4 } from 'uuid';

import {
	getStatefulSetMetricsQueryPayload,
	statefulSetWidgetInfo,
} from './constants';
import { StatefulSetDetailsProps } from './StatefulSetDetails.interfaces';

import '../../EntityDetailsUtils/entityDetails.styles.scss';

function StatefulSetDetails({
	statefulSet,
	onClose,
	isModalTimeSelection,
}: StatefulSetDetailsProps): JSX.Element {
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

	const [selectedView, setSelectedView] = useInfraMonitoringView();
	const [logFiltersParam, setLogFiltersParam] = useInfraMonitoringLogFilters();
	const [
		tracesFiltersParam,
		setTracesFiltersParam,
	] = useInfraMonitoringTracesFilters();
	const [
		eventsFiltersParam,
		setEventsFiltersParam,
	] = useInfraMonitoringEventsFilters();
	const isDarkMode = useIsDarkMode();

	const initialFilters = useMemo(() => {
		const filters =
			selectedView === VIEW_TYPES.LOGS ? logFiltersParam : tracesFiltersParam;
		if (filters) {
			return filters;
		}
		return {
			op: 'AND',
			items: [
				{
					id: uuidv4(),
					key: {
						key: QUERY_KEYS.K8S_STATEFUL_SET_NAME,
						dataType: DataTypes.String,
						type: 'resource',
						id: 'k8s_statefulset_name--string--resource--false',
					},
					op: '=',
					value: statefulSet?.meta.k8s_statefulset_name || '',
				},
				{
					id: uuidv4(),
					key: {
						key: QUERY_KEYS.K8S_NAMESPACE_NAME,
						dataType: DataTypes.String,
						type: 'resource',
						id: 'k8s_namespace_name--string--resource--false',
					},
					op: '=',
					value: statefulSet?.meta.k8s_namespace_name || '',
				},
			],
		};
	}, [
		statefulSet?.meta.k8s_statefulset_name,
		statefulSet?.meta.k8s_namespace_name,
		selectedView,
		logFiltersParam,
		tracesFiltersParam,
	]);

	const initialEventsFilters = useMemo(() => {
		if (eventsFiltersParam) {
			return eventsFiltersParam;
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
					value: 'StatefulSet',
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
					value: statefulSet?.meta.k8s_statefulset_name || '',
				},
			],
		};
	}, [statefulSet?.meta.k8s_statefulset_name, eventsFiltersParam]);

	const [logAndTracesFilters, setLogAndTracesFilters] = useState<
		IBuilderQuery['filters']
	>(initialFilters);

	const [eventsFilters, setEventsFilters] = useState<IBuilderQuery['filters']>(
		initialEventsFilters,
	);

	useEffect(() => {
		if (statefulSet) {
			logEvent(InfraMonitoringEvents.PageVisited, {
				entity: InfraMonitoringEvents.K8sEntity,
				page: InfraMonitoringEvents.DetailedPage,
				category: InfraMonitoringEvents.StatefulSet,
			});
		}
	}, [statefulSet]);

	useEffect(() => {
		setLogAndTracesFilters(initialFilters);
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
		setLogFiltersParam(null);
		setTracesFiltersParam(null);
		setEventsFiltersParam(null);
		logEvent(InfraMonitoringEvents.TabChanged, {
			entity: InfraMonitoringEvents.K8sEntity,
			page: InfraMonitoringEvents.DetailedPage,
			category: InfraMonitoringEvents.StatefulSet,
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
				category: InfraMonitoringEvents.StatefulSet,
				interval,
				view: selectedView,
			});
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);

	const handleChangeLogFilters = useCallback(
		(value: IBuilderQuery['filters'], view: VIEWS) => {
			setLogAndTracesFilters((prevFilters) => {
				const primaryFilters = prevFilters?.items?.filter((item) =>
					[QUERY_KEYS.K8S_STATEFUL_SET_NAME, QUERY_KEYS.K8S_NAMESPACE_NAME].includes(
						item.key?.key ?? '',
					),
				);
				const paginationFilter = value?.items?.find(
					(item) => item.key?.key === 'id',
				);
				const newFilters = value?.items?.filter(
					(item) =>
						item.key?.key !== 'id' &&
						item.key?.key !== QUERY_KEYS.K8S_STATEFUL_SET_NAME,
				);

				if (newFilters && newFilters?.length > 0) {
					logEvent(InfraMonitoringEvents.FilterApplied, {
						entity: InfraMonitoringEvents.K8sEntity,
						page: InfraMonitoringEvents.DetailedPage,
						category: InfraMonitoringEvents.StatefulSet,
						view: 'logs',
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

				setLogFiltersParam(updatedFilters);
				setSelectedView(view);

				return updatedFilters;
			});
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);

	const handleChangeTracesFilters = useCallback(
		(value: IBuilderQuery['filters'], view: VIEWS) => {
			setLogAndTracesFilters((prevFilters) => {
				const primaryFilters = prevFilters?.items?.filter((item) =>
					[QUERY_KEYS.K8S_STATEFUL_SET_NAME, QUERY_KEYS.K8S_NAMESPACE_NAME].includes(
						item.key?.key ?? '',
					),
				);

				if (value?.items && value?.items?.length > 0) {
					logEvent(InfraMonitoringEvents.FilterApplied, {
						entity: InfraMonitoringEvents.K8sEntity,
						page: InfraMonitoringEvents.DetailedPage,
						category: InfraMonitoringEvents.StatefulSet,
						view: 'traces',
					});
				}

				const updatedFilters = {
					op: 'AND',
					items: filterDuplicateFilters(
						[
							...(primaryFilters || []),
							...(value?.items?.filter(
								(item) => item.key?.key !== QUERY_KEYS.K8S_STATEFUL_SET_NAME,
							) || []),
						].filter((item): item is TagFilterItem => item !== undefined),
					),
				};

				setTracesFiltersParam(updatedFilters);
				setSelectedView(view);

				return updatedFilters;
			});
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);

	const handleChangeEventsFilters = useCallback(
		(value: IBuilderQuery['filters'], view: VIEWS) => {
			setEventsFilters((prevFilters) => {
				const statefulSetKindFilter = prevFilters?.items?.find(
					(item) => item.key?.key === QUERY_KEYS.K8S_OBJECT_KIND,
				);
				const statefulSetNameFilter = prevFilters?.items?.find(
					(item) => item.key?.key === QUERY_KEYS.K8S_OBJECT_NAME,
				);

				if (value?.items && value?.items?.length > 0) {
					logEvent(InfraMonitoringEvents.FilterApplied, {
						entity: InfraMonitoringEvents.K8sEntity,
						page: InfraMonitoringEvents.DetailedPage,
						category: InfraMonitoringEvents.StatefulSet,
						view: 'logs',
					});
				}

				const updatedFilters = {
					op: 'AND',
					items: [
						statefulSetKindFilter,
						statefulSetNameFilter,
						...(value?.items?.filter(
							(item) =>
								item.key?.key !== QUERY_KEYS.K8S_OBJECT_KIND &&
								item.key?.key !== QUERY_KEYS.K8S_OBJECT_NAME,
						) || []),
					].filter((item): item is TagFilterItem => item !== undefined),
				};

				setEventsFiltersParam(updatedFilters);
				setSelectedView(view);

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
			category: InfraMonitoringEvents.StatefulSet,
			view: selectedView,
		});

		if (selectedView === VIEW_TYPES.LOGS) {
			const filtersWithoutPagination = {
				...logAndTracesFilters,
				items:
					logAndTracesFilters?.items?.filter((item) => item.key?.key !== 'id') || [],
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

			openInNewTab(`${ROUTES.LOGS_EXPLORER}?${urlQuery.toString()}`);
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
							filters: logAndTracesFilters,
						},
					],
				},
			};

			urlQuery.set('compositeQuery', JSON.stringify(compositeQuery));

			openInNewTab(`${ROUTES.TRACES_EXPLORER}?${urlQuery.toString()}`);
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
						{statefulSet?.meta.k8s_statefulset_name}
					</Typography.Text>
				</>
			}
			placement="right"
			onClose={handleClose}
			open={!!statefulSet}
			style={{
				overscrollBehavior: 'contain',
				background: isDarkMode ? Color.BG_INK_400 : Color.BG_VANILLA_100,
			}}
			className="entity-detail-drawer"
			destroyOnClose
			closeIcon={<X size={16} style={{ marginTop: Spacing.MARGIN_1 }} />}
		>
			{statefulSet && (
				<>
					<div className="entity-detail-drawer__entity">
						<div className="entity-details-grid">
							<div className="labels-row">
								<Typography.Text
									type="secondary"
									className="entity-details-metadata-label"
								>
									Statefulset Name
								</Typography.Text>
								<Typography.Text
									type="secondary"
									className="entity-details-metadata-label"
								>
									Namespace Name
								</Typography.Text>
							</div>
							<div className="values-row">
								<Typography.Text className="entity-details-metadata-value">
									<Tooltip title={statefulSet.meta.k8s_statefulset_name}>
										{statefulSet.meta.k8s_statefulset_name}
									</Tooltip>
								</Typography.Text>
								<Typography.Text className="entity-details-metadata-value">
									<Tooltip title={statefulSet.meta.k8s_namespace_name}>
										{statefulSet.meta.k8s_namespace_name}
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
						<EntityMetrics
							timeRange={modalTimeRange}
							isModalTimeSelection={isModalTimeSelection}
							handleTimeChange={handleTimeChange}
							selectedInterval={selectedInterval}
							entity={statefulSet}
							entityWidgetInfo={statefulSetWidgetInfo}
							getEntityQueryPayload={getStatefulSetMetricsQueryPayload}
							category={K8sCategory.STATEFULSETS}
							queryKey="statefulsetMetrics"
						/>
					)}
					{selectedView === VIEW_TYPES.LOGS && (
						<EntityLogs
							timeRange={modalTimeRange}
							isModalTimeSelection={isModalTimeSelection}
							handleTimeChange={handleTimeChange}
							handleChangeLogFilters={handleChangeLogFilters}
							logFilters={logAndTracesFilters}
							selectedInterval={selectedInterval}
							queryKey="statefulsetLogs"
							category={K8sCategory.STATEFULSETS}
							queryKeyFilters={[
								QUERY_KEYS.K8S_STATEFUL_SET_NAME,
								QUERY_KEYS.K8S_NAMESPACE_NAME,
							]}
						/>
					)}
					{selectedView === VIEW_TYPES.TRACES && (
						<EntityTraces
							timeRange={modalTimeRange}
							isModalTimeSelection={isModalTimeSelection}
							handleTimeChange={handleTimeChange}
							handleChangeTracesFilters={handleChangeTracesFilters}
							tracesFilters={logAndTracesFilters}
							selectedInterval={selectedInterval}
							queryKey="statefulsetTraces"
							category={InfraMonitoringEvents.StatefulSet}
							queryKeyFilters={[
								QUERY_KEYS.K8S_STATEFUL_SET_NAME,
								QUERY_KEYS.K8S_NAMESPACE_NAME,
							]}
						/>
					)}
					{selectedView === VIEW_TYPES.EVENTS && (
						<EntityEvents
							timeRange={modalTimeRange}
							handleChangeEventFilters={handleChangeEventsFilters}
							filters={eventsFilters}
							isModalTimeSelection={isModalTimeSelection}
							handleTimeChange={handleTimeChange}
							selectedInterval={selectedInterval}
							category={K8sCategory.STATEFULSETS}
							queryKey="statefulsetEvents"
						/>
					)}
				</>
			)}
		</Drawer>
	);
}

export default StatefulSetDetails;
