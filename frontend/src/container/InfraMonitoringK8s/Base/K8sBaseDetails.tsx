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
import { Button, Divider, Drawer, Radio, Tooltip } from 'antd';
import { Typography } from '@signozhq/ui/typography';
import type { RadioChangeEvent } from 'antd/lib';
import logEvent from 'api/common/logEvent';
import { combineInitialAndUserExpression } from 'components/QueryBuilderV2/QueryV2/QuerySearch/utils';
import { convertFiltersToExpression } from 'components/QueryBuilderV2/utils';
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
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import GetMinMax from 'lib/getMinMax';
import {
	BarChart,
	ChevronsLeftRight,
	Compass,
	DraftingCompass,
	Package2,
	ScrollText,
	X,
} from '@signozhq/icons';
import { isCustomTimeRange, useGlobalTimeStore } from 'store/globalTime';
import { NANO_SECOND_MULTIPLIER } from 'store/globalTime/utils';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	TagFilter,
	TagFilterItem,
} from 'types/api/queryBuilder/queryBuilderData';
import {
	LogsAggregatorOperator,
	TracesAggregatorOperator,
} from 'types/common/queryBuilder';
import { openInNewTab } from 'utils/navigation';
import { v4 as uuidv4 } from 'uuid';

import { InfraMonitoringEntity, VIEW_TYPES } from '../constants';
import EntityContainers from '../EntityDetailsUtils/EntityContainers';
import EntityEvents from '../EntityDetailsUtils/EntityEvents';
import EntityLogs from '../EntityDetailsUtils/EntityLogs';
import { K8S_ENTITY_LOGS_EXPRESSION_KEY } from '../EntityDetailsUtils/EntityLogs/hooks';
import EntityMetrics from '../EntityDetailsUtils/EntityMetrics';
import EntityProcesses from '../EntityDetailsUtils/EntityProcesses';
import EntityTraces from '../EntityDetailsUtils/EntityTraces';
import { K8S_ENTITY_TRACES_EXPRESSION_KEY } from '../EntityDetailsUtils/EntityTraces/hooks';
import {
	useInfraMonitoringEventsFilters,
	useInfraMonitoringLogFilters,
	useInfraMonitoringSelectedItem,
	useInfraMonitoringTracesFilters,
	useInfraMonitoringView,
} from '../hooks';
import LoadingContainer from '../LoadingContainer';

import '../EntityDetailsUtils/entityDetails.styles.scss';
import { parseAsString, useQueryState } from 'nuqs';

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
	/**
	 * @deprecated It's not needed anymore, remove in the next PR
	 */
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
export default function K8sBaseDetails<T>({
	category,
	eventCategory,
	getSelectedItemFilters,
	fetchEntityData,
	getEntityName,
	getInitialLogTracesFilters,
	getInitialEventsFilters,
	metadataConfig,
	entityWidgetInfo,
	getEntityQueryPayload,
	queryKeyPrefix,
	hideDetailViewTabs = false,
	tabsConfig,
	customTabs,
}: K8sBaseDetailsProps<T>): JSX.Element {
	const selectedTime = useGlobalTimeStore((s) => s.selectedTime);
	const getMinMaxTime = useGlobalTimeStore((s) => s.getMinMaxTime);
	const lastComputedMinMax = useGlobalTimeStore((s) => s.lastComputedMinMax);
	const getAutoRefreshQueryKey = useGlobalTimeStore(
		(s) => s.getAutoRefreshQueryKey,
	);

	const isDarkMode = useIsDarkMode();

	const [selectedItem, setSelectedItem] = useInfraMonitoringSelectedItem();

	const entityQueryKey = useMemo(
		() =>
			getAutoRefreshQueryKey(
				selectedTime,
				`${queryKeyPrefix}EntityDetails`,
				selectedItem,
			),
		[queryKeyPrefix, selectedItem, selectedTime, getAutoRefreshQueryKey],
	);

	const {
		data: entityResponse,
		isLoading: isEntityLoading,
		isError: isEntityError,
		error: entityError,
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
	const hasResponseError = !!entityResponse?.error;

	const logsAndTracesInitialExpression = useMemo(() => {
		if (!entity) {
			return '';
		}
		const primaryFiltersOnly = {
			op: 'AND' as const,
			items: getInitialLogTracesFilters(entity),
		};
		return convertFiltersToExpression(primaryFiltersOnly).expression;
	}, [entity, getInitialLogTracesFilters]);

	const eventsInitialExpression = useMemo(() => {
		if (!entity) {
			return '';
		}
		const primaryFiltersOnly = {
			op: 'AND' as const,
			items: getInitialEventsFilters(entity),
		};
		return convertFiltersToExpression(primaryFiltersOnly).expression;
	}, [entity, getInitialEventsFilters]);

	const handleClose = useCallback((): void => {
		setSelectedItem(null);
	}, [setSelectedItem]);

	const entityName = entity ? getEntityName(entity) : '';

	// Content state (previously in K8sBaseDetailsContent)
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

	const { startMs, endMs } = useMemo(
		() => ({
			startMs: Math.floor(lastComputedMinMax.minTime / NANO_SECOND_MULTIPLIER),
			endMs: Math.floor(lastComputedMinMax.maxTime / NANO_SECOND_MULTIPLIER),
		}),
		[lastComputedMinMax],
	);

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

	const [, setLogFiltersParam] = useInfraMonitoringLogFilters();
	const [, setTracesFiltersParam] = useInfraMonitoringTracesFilters();
	const [, setEventsFiltersParam] = useInfraMonitoringEventsFilters();
	const [userLogsExpression] = useQueryState(
		K8S_ENTITY_LOGS_EXPRESSION_KEY,
		parseAsString,
	);
	const [userTracesExpression] = useQueryState(
		K8S_ENTITY_TRACES_EXPRESSION_KEY,
		parseAsString,
	);

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

	const handleExplorePagesRedirect = (): void => {
		const urlQuery = new URLSearchParams();

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
			const fullExpression = combineInitialAndUserExpression(
				logsAndTracesInitialExpression,
				userLogsExpression || '',
			);

			const compositeQuery = {
				...initialQueryState,
				queryType: 'builder',
				builder: {
					...initialQueryState.builder,
					queryData: [
						{
							...initialQueryBuilderFormValuesMap.logs,
							aggregateOperator: LogsAggregatorOperator.NOOP,
							expression: fullExpression,
							filter: { expression: fullExpression },
						},
					],
				},
			};

			urlQuery.set('compositeQuery', JSON.stringify(compositeQuery));

			openInNewTab(`${ROUTES.LOGS_EXPLORER}?${urlQuery.toString()}`);
		} else if (selectedView === VIEW_TYPES.TRACES) {
			const fullExpression = combineInitialAndUserExpression(
				logsAndTracesInitialExpression,
				userTracesExpression || '',
			);

			const compositeQuery = {
				...initialQueryState,
				queryType: 'builder',
				builder: {
					...initialQueryState.builder,
					queryData: [
						{
							...initialQueryBuilderFormValuesMap.traces,
							aggregateOperator: TracesAggregatorOperator.NOOP,
							expression: fullExpression,
							filter: { expression: fullExpression },
						},
					],
				},
			};

			urlQuery.set('compositeQuery', JSON.stringify(compositeQuery));

			openInNewTab(`${ROUTES.TRACES_EXPLORER}?${urlQuery.toString()}`);
		}
	};

	return (
		<Drawer
			width="70%"
			title={
				<>
					<Divider type="vertical" />
					<Typography.Text className="title">
						{entityName ||
							((isEntityError || hasResponseError) &&
								'Failed to load entity details') ||
							(isEntityLoading && 'Loading...') ||
							'-'}
					</Typography.Text>
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
			{(isEntityError || hasResponseError) && (
				<div className="entity-error-container">
					<Typography.Text color="danger">
						{entityResponse?.error ||
							(entityError instanceof Error
								? entityError.message
								: 'Failed to load entity details')}
					</Typography.Text>
				</div>
			)}
			{entity && !isEntityLoading && !hasResponseError && (
				<>
					<div className="entity-detail-drawer__entity">
						<div className="entity-details-grid">
							<div className="labels-row">
								{metadataConfig.map((config) => (
									<Typography.Text
										key={config.label}
										color="muted"
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
											<BarChart size={14} />
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

							{selectedView === VIEW_TYPES.LOGS && (
								<Tooltip title="Go to Logs Explorer" placement="left">
									<Button
										icon={<Compass size={18} />}
										className="compass-button"
										onClick={handleExplorePagesRedirect}
									/>
								</Tooltip>
							)}
							{selectedView === VIEW_TYPES.TRACES && (
								<Tooltip title="Go to Traces Explorer" placement="left">
									<Button
										icon={<Compass size={18} />}
										className="compass-button"
										onClick={handleExplorePagesRedirect}
									/>
								</Tooltip>
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
							selectedInterval={selectedInterval}
							queryKey={`${queryKeyPrefix}Logs`}
							category={category}
							initialExpression={logsAndTracesInitialExpression}
						/>
					)}
					{effectiveView === VIEW_TYPES.TRACES && (
						<EntityTraces
							timeRange={modalTimeRange}
							isModalTimeSelection
							handleTimeChange={handleTimeChange}
							selectedInterval={selectedInterval}
							queryKey={`${queryKeyPrefix}Traces`}
							category={category}
							initialExpression={logsAndTracesInitialExpression}
						/>
					)}
					{effectiveView === VIEW_TYPES.EVENTS && tabVisibility.showEvents && (
						<EntityEvents
							timeRange={modalTimeRange}
							isModalTimeSelection
							handleTimeChange={handleTimeChange}
							selectedInterval={selectedInterval}
							category={category}
							queryKey={`${queryKeyPrefix}Events`}
							initialExpression={eventsInitialExpression}
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
