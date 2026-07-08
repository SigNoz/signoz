import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import {
	BarChart,
	ChevronsLeftRight,
	Compass,
	DraftingCompass,
	ScrollText,
} from '@signozhq/icons';
import { ToggleGroupSimple } from '@signozhq/ui/toggle-group';
import { Typography } from '@signozhq/ui/typography';
import { Button, Tooltip } from 'antd';
import logEvent from 'api/common/logEvent';
import { combineInitialAndUserExpression } from 'components/QueryBuilderV2/QueryV2/QuerySearch/utils';
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
import GetMinMax from 'lib/getMinMax';
import { parseAsString, useQueryState } from 'nuqs';
import { isCustomTimeRange, useGlobalTimeStore } from 'store/globalTime';
import { NANO_SECOND_MULTIPLIER } from 'store/globalTime/utils';
import {
	LogsAggregatorOperator,
	TracesAggregatorOperator,
} from 'types/common/queryBuilder';
import { openInNewTab } from 'utils/navigation';

import { VIEW_TYPES } from '../constants';
import EntityEvents from '../EntityDetailsUtils/EntityEvents';
import EntityLogs from '../EntityDetailsUtils/EntityLogs';
import { K8S_ENTITY_LOGS_EXPRESSION_KEY } from '../EntityDetailsUtils/EntityLogs/hooks';
import EntityMetrics from '../EntityDetailsUtils/EntityMetrics';
import EntityTraces from '../EntityDetailsUtils/EntityTraces';
import { K8S_ENTITY_TRACES_EXPRESSION_KEY } from '../EntityDetailsUtils/EntityTraces/hooks';
import {
	useInfraMonitoringEventsFilters,
	useInfraMonitoringLogFilters,
	useInfraMonitoringTracesFilters,
	useInfraMonitoringView,
} from '../hooks';

import { K8sBaseDetailsContentProps } from './types';

const TimeRangeOffset = 1000000000;

// eslint-disable-next-line sonarjs/cognitive-complexity
export default function K8sBaseDetailsContent<T>({
	entity,
	category,
	eventCategory,
	metadataConfig,
	entityWidgetInfo,
	getEntityQueryPayload,
	queryKeyPrefix,
	hideDetailViewTabs,
	tabsConfig,
	customTabs,
	logsAndTracesInitialExpression,
	eventsInitialExpression,
}: K8sBaseDetailsContentProps<T>): JSX.Element {
	const selectedTime = useGlobalTimeStore((s) => s.selectedTime);
	const getMinMaxTime = useGlobalTimeStore((s) => s.getMinMaxTime);
	const lastComputedMinMax = useGlobalTimeStore((s) => s.lastComputedMinMax);

	const tabVisibility = useMemo(
		() => ({
			showMetrics: true,
			showLogs: true,
			showTraces: true,
			showEvents: true,
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

	const handleTabChange = (value: string): void => {
		setSelectedView(value);
		setLogFiltersParam(null);
		setTracesFiltersParam(null);
		setEventsFiltersParam(null);
		logEvent(InfraMonitoringEvents.TabChanged, {
			entity: InfraMonitoringEvents.K8sEntity,
			page: InfraMonitoringEvents.DetailedPage,
			category: eventCategory,
			view: value,
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
					<ToggleGroupSimple
						type="single"
						className="views-tabs"
						onChange={handleTabChange}
						value={selectedView}
						items={[
							...(tabVisibility.showMetrics
								? [
										{
											value: VIEW_TYPES.METRICS,
											label: (
												<div className="view-title">
													<BarChart size={14} />
													Metrics
												</div>
											),
										},
									]
								: []),
							...(tabVisibility.showLogs
								? [
										{
											value: VIEW_TYPES.LOGS,
											label: (
												<div className="view-title">
													<ScrollText size={14} />
													Logs
												</div>
											),
										},
									]
								: []),
							...(tabVisibility.showTraces
								? [
										{
											value: VIEW_TYPES.TRACES,
											label: (
												<div className="view-title">
													<DraftingCompass size={14} />
													Traces
												</div>
											),
										},
									]
								: []),
							...(tabVisibility.showEvents
								? [
										{
											value: VIEW_TYPES.EVENTS,
											label: (
												<div className="view-title">
													<ChevronsLeftRight size={14} />
													Events
												</div>
											),
										},
									]
								: []),
							...(customTabs?.map((tab) => ({
								value: tab.key,
								label: (
									<div className="view-title">
										{tab.icon}
										{tab.label}
									</div>
								),
							})) ?? []),
						]}
					/>

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
	);
}
