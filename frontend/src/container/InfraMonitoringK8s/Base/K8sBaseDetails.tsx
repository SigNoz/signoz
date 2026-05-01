import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { useQuery } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { Color, Spacing } from '@signozhq/design-tokens';
import { Button, Divider, Drawer, Radio, Tooltip, Typography } from 'antd';
import type { RadioChangeEvent } from 'antd/lib';
import logEvent from 'api/common/logEvent';
import { InfraMonitoringEvents } from 'constants/events';
import { QueryParams } from 'constants/query';
import {
	initialQueryBuilderFormValuesMap,
	initialQueryState,
} from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { DEFAULT_TIME_RANGE } from 'container/TopNav/DateTimeSelectionV2/constants';
import {
	CustomTimeType,
	Time,
} from 'container/TopNav/DateTimeSelectionV2/types';
import { useIsDarkMode } from 'hooks/useDarkMode';
import useUrlQuery from 'hooks/useUrlQuery';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import GetMinMax from 'lib/getMinMax';
import {
	BarChart2,
	ChevronsLeftRight,
	Compass,
	DraftingCompass,
	Package2,
	ScrollText,
	X,
} from 'lucide-react';
import { isCustomTimeRange, useGlobalTimeStore } from 'store/globalTime';
import {
	getAutoRefreshQueryKey,
	NANO_SECOND_MULTIPLIER,
} from 'store/globalTime/utils';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	IBuilderQuery,
	TagFilter,
	TagFilterItem,
} from 'types/api/queryBuilder/queryBuilderData';
import {
	LogsAggregatorOperator,
	TracesAggregatorOperator,
} from 'types/common/queryBuilder';
import { openInNewTab } from 'utils/navigation';
import { v4 as uuidv4 } from 'uuid';

import { filterDuplicateFilters } from '../commonUtils';
import { InfraMonitoringEntity, VIEW_TYPES, VIEWS } from '../constants';
import EntityContainers from '../EntityDetailsUtils/EntityContainers';
import EntityEvents from '../EntityDetailsUtils/EntityEvents';
import EntityLogs from '../EntityDetailsUtils/EntityLogs';
import EntityMetrics from '../EntityDetailsUtils/EntityMetrics';
import EntityProcesses from '../EntityDetailsUtils/EntityProcesses';
import EntityTraces from '../EntityDetailsUtils/EntityTraces';
import { QUERY_KEYS } from '../EntityDetailsUtils/utils';
import {
	useInfraMonitoringEventsFilters,
	useInfraMonitoringLogFilters,
	useInfraMonitoringSelectedItem,
	useInfraMonitoringTracesFilters,
	useInfraMonitoringView,
} from '../hooks';
import LoadingContainer from '../LoadingContainer';

import '../EntityDetailsUtils/entityDetails.styles.scss';

const TimeRangeOffset = 1000000000;

export interface K8sDetailsMetadataConfig<T> {
	label: string;
	getValue: (entity: T) => string | number;
	render?: (value: string | number, entity: T) => React.ReactNode;
}

export interface K8sDetailsFilters {
	filters: TagFilter;
	start: number;
	end: number;
}

export interface K8sBaseDetailsProps<T> {
	category: InfraMonitoringEntity;
	eventCategory: string;
	// Data fetching configuration
	getSelectedItemFilters: (selectedItem: string) => TagFilter;
	fetchEntityData: (
		filters: K8sDetailsFilters,
		signal?: AbortSignal,
	) => Promise<{ data: T | null; error?: string | null }>;
	// Entity configuration
	getEntityName: (entity: T) => string;
	getInitialLogTracesFilters: (entity: T) => TagFilterItem[];
	getInitialEventsFilters: (entity: T) => TagFilterItem[];
	primaryFilterKeys: string[];
	metadataConfig: K8sDetailsMetadataConfig<T>[];
	entityWidgetInfo: {
		title: string;
		yAxisUnit: string;
	}[];
	getEntityQueryPayload: (
		entity: T,
		start: number,
		end: number,
		dotMetricsEnabled: boolean,
	) => GetQueryResultsProps[];
	queryKeyPrefix: string;
	/** When true, only metrics are shown and the Metrics/Logs/Traces/Events tab bar is hidden. */
	hideDetailViewTabs?: boolean;
	tabsConfig?: {
		showMetrics?: boolean;
		showLogs?: boolean;
		showTraces?: boolean;
		showEvents?: boolean;
		showContainers?: boolean;
		showProcesses?: boolean;
	};
	customTabs?: Array<{
		key: string;
		label: string;
		icon: React.ReactNode;
		render: (props: {
			entity: T;
			timeRange: { startTime: number; endTime: number };
			selectedInterval: Time;
			handleTimeChange: (
				interval: Time | CustomTimeType,
				dateTimeRange?: [number, number],
			) => void;
		}) => React.ReactNode;
	}>;
}

export function createFilterItem(
	key: string,
	value: string,
	dataType: DataTypes = DataTypes.String,
): TagFilterItem {
	return {
		id: uuidv4(),
		key: {
			key,
			dataType,
			type: 'resource',
			id: `${key}--string--resource--false`,
		},
		op: '=',
		value,
	};
}

// eslint-disable-next-line sonarjs/cognitive-complexity
function K8sBaseDetails<T>({
	category,
	eventCategory,
	getSelectedItemFilters,
	fetchEntityData,
	getEntityName,
	getInitialLogTracesFilters,
	getInitialEventsFilters,
	primaryFilterKeys,
	metadataConfig,
	entityWidgetInfo,
	getEntityQueryPayload,
	queryKeyPrefix,
	hideDetailViewTabs = false,
	tabsConfig,
	customTabs,
}: K8sBaseDetailsProps<T>): JSX.Element {
	const tabVisibility = useMemo(
		() => ({
			showMetrics: true,
			showLogs: true,
			showTraces: true,
			showEvents: true,
			showContainers: false,
			showProcesses: false,
			...tabsConfig,
		}),
		[tabsConfig],
	);

	const selectedTime = useGlobalTimeStore((s) => s.selectedTime);
	const getMinMaxTime = useGlobalTimeStore((s) => s.getMinMaxTime);

	const { startMs, endMs } = useMemo(() => {
		const { minTime: startNs, maxTime: endNs } = getMinMaxTime(selectedTime);

		return {
			startMs: Math.floor(startNs / NANO_SECOND_MULTIPLIER),
			endMs: Math.floor(endNs / NANO_SECOND_MULTIPLIER),
		};
	}, [getMinMaxTime, selectedTime]);

	const [modalTimeRange, setModalTimeRange] = useState(() => ({
		startTime: startMs,
		endTime: endMs,
	}));

	// TODO(h4ad): Remove this and use context/zustand
	const lastSelectedInterval = useRef<Time | null>(null);
	const [selectedInterval, setSelectedInterval] = useState<Time>(
		lastSelectedInterval.current
			? lastSelectedInterval.current
			: isCustomTimeRange(selectedTime)
				? DEFAULT_TIME_RANGE
				: selectedTime,
	);

	const [selectedView, setSelectedView] = useInfraMonitoringView();
	const effectiveView = hideDetailViewTabs ? VIEW_TYPES.METRICS : selectedView;

	const [logFiltersParam, setLogFiltersParam] = useInfraMonitoringLogFilters();
	const [tracesFiltersParam, setTracesFiltersParam] =
		useInfraMonitoringTracesFilters();
	const [eventsFiltersParam, setEventsFiltersParam] =
		useInfraMonitoringEventsFilters();
	const isDarkMode = useIsDarkMode();

	const [selectedItem, setSelectedItem] = useInfraMonitoringSelectedItem();
	const urlQuery = useUrlQuery();

	useEffect(() => {
		if (
			hideDetailViewTabs &&
			selectedItem &&
			selectedView !== VIEW_TYPES.METRICS
		) {
			setSelectedView(VIEW_TYPES.METRICS);
		}
	}, [hideDetailViewTabs, selectedItem, selectedView, setSelectedView]);

	const entityQueryKey = useMemo(
		() =>
			getAutoRefreshQueryKey(
				selectedTime,
				`${queryKeyPrefix}EntityDetails`,
				selectedItem,
			),
		[queryKeyPrefix, selectedItem, selectedTime],
	);

	const {
		data: entityResponse,
		isLoading: isEntityLoading,
		isError: isEntityError,
	} = useQuery({
		queryKey: entityQueryKey,
		queryFn: ({ signal }) => {
			if (!selectedItem) {
				return { data: null };
			}
			const filters = getSelectedItemFilters(selectedItem);
			const { minTime, maxTime } = getMinMaxTime();

			return fetchEntityData(
				{
					filters,
					start: Math.floor(minTime / NANO_SECOND_MULTIPLIER),
					end: Math.floor(maxTime / NANO_SECOND_MULTIPLIER),
				},
				signal,
			);
		},
		enabled: !!selectedItem,
	});

	const entity = entityResponse?.data ?? null;

	const initialFilters = useMemo(() => {
		const filters =
			effectiveView === VIEW_TYPES.LOGS ? logFiltersParam : tracesFiltersParam;
		if (filters) {
			return filters;
		}
		if (!entity) {
			return { op: 'AND', items: [] };
		}
		return {
			op: 'AND',
			items: getInitialLogTracesFilters(entity),
		};
	}, [
		entity,
		effectiveView,
		logFiltersParam,
		tracesFiltersParam,
		getInitialLogTracesFilters,
	]);

	const initialEventsFilters = useMemo(() => {
		if (eventsFiltersParam) {
			return eventsFiltersParam;
		}
		if (!entity) {
			return { op: 'AND', items: [] };
		}
		return {
			op: 'AND',
			items: getInitialEventsFilters(entity),
		};
	}, [entity, eventsFiltersParam, getInitialEventsFilters]);

	const [logsAndTracesFilters, setLogsAndTracesFilters] =
		useState<IBuilderQuery['filters']>(initialFilters);

	const [eventsFilters, setEventsFilters] =
		useState<IBuilderQuery['filters']>(initialEventsFilters);

	useEffect(() => {
		if (entity) {
			logEvent(InfraMonitoringEvents.PageVisited, {
				entity: InfraMonitoringEvents.K8sEntity,
				page: InfraMonitoringEvents.DetailedPage,
				category: eventCategory,
			});
		}
	}, [entity, eventCategory]);

	useEffect(() => {
		setLogsAndTracesFilters(initialFilters);
		setEventsFilters(initialEventsFilters);
	}, [initialFilters, initialEventsFilters]);

	useEffect(() => {
		const currentSelectedInterval = lastSelectedInterval.current || selectedTime;
		if (!isCustomTimeRange(currentSelectedInterval)) {
			setSelectedInterval(currentSelectedInterval);
			const { minTime, maxTime } = getMinMaxTime();

			setModalTimeRange({
				startTime: Math.floor(minTime / TimeRangeOffset),
				endTime: Math.floor(maxTime / TimeRangeOffset),
			});
		}
	}, [getMinMaxTime, selectedTime]);

	const handleTabChange = (e: RadioChangeEvent): void => {
		setSelectedView(e.target.value);
		setLogFiltersParam(null);
		setTracesFiltersParam(null);
		setEventsFiltersParam(null);
		logEvent(InfraMonitoringEvents.TabChanged, {
			entity: InfraMonitoringEvents.K8sEntity,
			page: InfraMonitoringEvents.DetailedPage,
			category: eventCategory,
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
					startTime: Math.floor(minTime / TimeRangeOffset),
					endTime: Math.floor(maxTime / TimeRangeOffset),
				});
			}

			logEvent(InfraMonitoringEvents.TimeUpdated, {
				entity: InfraMonitoringEvents.K8sEntity,
				page: InfraMonitoringEvents.DetailedPage,
				category: eventCategory,
				interval,
				view: effectiveView,
			});
		},
		[eventCategory, effectiveView],
	);

	const handleChangeLogFilters = useCallback(
		(value: IBuilderQuery['filters'], view: VIEWS) => {
			setLogsAndTracesFilters((prevFilters) => {
				const primaryFilters = prevFilters?.items?.filter((item) =>
					primaryFilterKeys.includes(item.key?.key ?? ''),
				);
				const paginationFilter = value?.items?.find(
					(item) => item.key?.key === 'id',
				);
				const newFilters = value?.items?.filter(
					(item) =>
						item.key?.key !== 'id' &&
						!primaryFilterKeys.includes(item.key?.key ?? ''),
				);

				if (newFilters && newFilters?.length > 0) {
					logEvent(InfraMonitoringEvents.FilterApplied, {
						entity: InfraMonitoringEvents.K8sEntity,
						page: InfraMonitoringEvents.DetailedPage,
						category: eventCategory,
						view: selectedView,
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
		[
			setLogFiltersParam,
			setSelectedView,
			primaryFilterKeys,
			eventCategory,
			selectedView,
		],
	);

	const handleChangeTracesFilters = useCallback(
		(value: IBuilderQuery['filters'], view: VIEWS) => {
			setLogsAndTracesFilters((prevFilters) => {
				const primaryFilters = prevFilters?.items?.filter((item) =>
					primaryFilterKeys.includes(item.key?.key ?? ''),
				);

				if (value?.items && value?.items?.length > 0) {
					logEvent(InfraMonitoringEvents.FilterApplied, {
						entity: InfraMonitoringEvents.K8sEntity,
						page: InfraMonitoringEvents.DetailedPage,
						category: eventCategory,
						view: selectedView,
					});
				}

				const updatedFilters = {
					op: 'AND',
					items: filterDuplicateFilters(
						[
							...(primaryFilters || []),
							...(value?.items?.filter(
								(item) => !primaryFilterKeys.includes(item.key?.key ?? ''),
							) || []),
						].filter((item): item is TagFilterItem => item !== undefined),
					),
				};

				setTracesFiltersParam(updatedFilters);
				setSelectedView(view);

				return updatedFilters;
			});
		},
		[
			setTracesFiltersParam,
			setSelectedView,
			primaryFilterKeys,
			eventCategory,
			selectedView,
		],
	);

	const handleChangeEventsFilters = useCallback(
		(value: IBuilderQuery['filters'], view: VIEWS) => {
			setEventsFilters((prevFilters) => {
				const kindFilter = prevFilters?.items?.find(
					(item) => item.key?.key === QUERY_KEYS.K8S_OBJECT_KIND,
				);
				const nameFilter = prevFilters?.items?.find(
					(item) => item.key?.key === QUERY_KEYS.K8S_OBJECT_NAME,
				);

				if (value?.items && value?.items?.length > 0) {
					logEvent(InfraMonitoringEvents.FilterApplied, {
						entity: InfraMonitoringEvents.K8sEntity,
						page: InfraMonitoringEvents.DetailedPage,
						category: eventCategory,
						view: selectedView,
					});
				}

				const updatedFilters = {
					op: 'AND',
					items: filterDuplicateFilters(
						[
							kindFilter,
							nameFilter,
							...(value?.items?.filter(
								(item) =>
									item.key?.key !== QUERY_KEYS.K8S_OBJECT_KIND &&
									item.key?.key !== QUERY_KEYS.K8S_OBJECT_NAME,
							) || []),
						].filter((item): item is TagFilterItem => item !== undefined),
					),
				};

				setEventsFiltersParam(updatedFilters);
				setSelectedView(view);

				return updatedFilters;
			});
		},
		[eventCategory, selectedView, setEventsFiltersParam, setSelectedView],
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
			category: eventCategory,
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
							filters: logsAndTracesFilters,
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

		setSelectedItem(null);
		setSelectedView(null);
		setTracesFiltersParam(null);
		setEventsFiltersParam(null);
		setLogFiltersParam(null);
	};

	const entityName = entity ? getEntityName(entity) : '';

	return (
		<Drawer
			width="70%"
			title={
				<>
					<Divider type="vertical" />
					<Typography.Text className="title">{entityName}</Typography.Text>
				</>
			}
			placement="right"
			onClose={handleClose}
			open={!!selectedItem}
			style={{
				overscrollBehavior: 'contain',
				background: isDarkMode ? Color.BG_INK_400 : Color.BG_VANILLA_100,
			}}
			className="entity-detail-drawer"
			destroyOnClose
			closeIcon={<X size={16} style={{ marginTop: Spacing.MARGIN_1 }} />}
		>
			{isEntityLoading && <LoadingContainer />}
			{isEntityError && (
				<Typography.Text type="danger">
					{entityResponse?.error || 'Failed to load entity details'}
				</Typography.Text>
			)}
			{entity && !isEntityLoading && (
				<>
					<div className="entity-detail-drawer__entity">
						<div className="entity-details-grid">
							<div className="labels-row">
								{metadataConfig.map((config) => (
									<Typography.Text
										key={config.label}
										type="secondary"
										className="entity-details-metadata-label"
									>
										{config.label}
									</Typography.Text>
								))}
							</div>

							<div className="values-row">
								{metadataConfig.map((config) => {
									const value = config.getValue(entity);
									const displayValue = String(value);
									return (
										<Typography.Text
											key={config.label}
											className="entity-details-metadata-value"
										>
											{config.render ? (
												config.render(value, entity)
											) : (
												<Tooltip title={displayValue}>{displayValue}</Tooltip>
											)}
										</Typography.Text>
									);
								})}
							</div>
						</div>
					</div>

					{!hideDetailViewTabs && (
						<div className="views-tabs-container">
							<Radio.Group
								className="views-tabs"
								onChange={handleTabChange}
								value={selectedView}
							>
								{tabVisibility.showMetrics && (
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
								)}
								{tabVisibility.showLogs && (
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
								)}
								{tabVisibility.showTraces && (
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
								)}
								{tabVisibility.showEvents && (
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
								)}
								{tabVisibility.showContainers && (
									<Radio.Button
										className={
											selectedView === VIEW_TYPES.CONTAINERS ? 'selected_view tab' : 'tab'
										}
										value={VIEW_TYPES.CONTAINERS}
									>
										<div className="view-title">
											<Package2 size={14} />
											Containers
										</div>
									</Radio.Button>
								)}
								{tabVisibility.showProcesses && (
									<Radio.Button
										className={
											selectedView === VIEW_TYPES.PROCESSES ? 'selected_view tab' : 'tab'
										}
										value={VIEW_TYPES.PROCESSES}
									>
										<div className="view-title">
											<ChevronsLeftRight size={14} />
											Processes
										</div>
									</Radio.Button>
								)}
								{customTabs?.map((tab) => (
									<Radio.Button
										key={tab.key}
										className={selectedView === tab.key ? 'selected_view tab' : 'tab'}
										value={tab.key}
									>
										<div className="view-title">
											{tab.icon}
											{tab.label}
										</div>
									</Radio.Button>
								))}
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
					)}

					{effectiveView === VIEW_TYPES.METRICS && (
						<EntityMetrics<T>
							entity={entity}
							selectedInterval={selectedInterval}
							timeRange={modalTimeRange}
							handleTimeChange={handleTimeChange}
							isModalTimeSelection
							entityWidgetInfo={entityWidgetInfo}
							getEntityQueryPayload={getEntityQueryPayload}
							category={category}
							queryKey={`${queryKeyPrefix}Metrics`}
						/>
					)}
					{effectiveView === VIEW_TYPES.LOGS && (
						<EntityLogs
							timeRange={modalTimeRange}
							isModalTimeSelection
							handleTimeChange={handleTimeChange}
							handleChangeLogFilters={handleChangeLogFilters}
							logFilters={logsAndTracesFilters}
							selectedInterval={selectedInterval}
							queryKeyFilters={primaryFilterKeys}
							queryKey={`${queryKeyPrefix}Logs`}
							category={category}
						/>
					)}
					{effectiveView === VIEW_TYPES.TRACES && (
						<EntityTraces
							timeRange={modalTimeRange}
							isModalTimeSelection
							handleTimeChange={handleTimeChange}
							handleChangeTracesFilters={handleChangeTracesFilters}
							tracesFilters={logsAndTracesFilters}
							selectedInterval={selectedInterval}
							queryKey={`${queryKeyPrefix}Traces`}
							category={eventCategory}
							queryKeyFilters={primaryFilterKeys}
						/>
					)}
					{effectiveView === VIEW_TYPES.EVENTS && tabVisibility.showEvents && (
						<EntityEvents
							timeRange={modalTimeRange}
							isModalTimeSelection
							handleTimeChange={handleTimeChange}
							handleChangeEventFilters={handleChangeEventsFilters}
							filters={eventsFilters}
							selectedInterval={selectedInterval}
							category={category}
							queryKey={`${queryKeyPrefix}Events`}
						/>
					)}
					{effectiveView === VIEW_TYPES.CONTAINERS &&
						tabVisibility.showContainers && <EntityContainers />}
					{effectiveView === VIEW_TYPES.PROCESSES && tabVisibility.showProcesses && (
						<EntityProcesses />
					)}
					{customTabs?.map((tab) =>
						selectedView === tab.key ? (
							<React.Fragment key={tab.key}>
								{tab.render({
									entity,
									timeRange: modalTimeRange,
									selectedInterval,
									handleTimeChange,
								})}
							</React.Fragment>
						) : null,
					)}
				</>
			)}
		</Drawer>
	);
}

export default K8sBaseDetails;
