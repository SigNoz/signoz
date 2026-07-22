import { Fragment, useEffect, useMemo } from 'react';
import {
	BarChart,
	ChevronsLeftRight,
	Compass,
	DraftingCompass,
	ScrollText,
} from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { ToggleGroupSimple } from '@signozhq/ui/toggle-group';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import { Typography } from '@signozhq/ui/typography';
import logEvent from 'api/common/logEvent';
import { combineInitialAndUserExpression } from 'components/QueryBuilderV2/QueryV2/QuerySearch/utils';
import { InfraMonitoringEvents } from 'constants/events';
import { QueryParams } from 'constants/query';
import {
	initialQueryBuilderFormValuesMap,
	initialQueryState,
} from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { parseAsString, useQueryState } from 'nuqs';
import {
	LogsAggregatorOperator,
	TracesAggregatorOperator,
} from 'types/common/queryBuilder';
import { openInNewTab } from 'utils/navigation';

import { VIEW_TYPES } from '../constants';
import { useEntityDetailsTime } from '../EntityDetailsUtils/EntityDateTimeSelector/useEntityDetailsTime';
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

import { EntityCountsSection } from './components/EntityCountsSection/EntityCountsSection';
import { K8sBaseDetailsContentProps } from './types';

import styles from '../EntityDetailsUtils/entityDetails.module.scss';

// eslint-disable-next-line sonarjs/cognitive-complexity
export default function K8sBaseDetailsContent<T>({
	entity,
	category,
	eventCategory,
	metadataConfig,
	countsConfig,
	getCountsFilterExpression,
	selectedItem,
	handleClose,
	entityWidgetInfo,
	getEntityQueryPayload,
	queryKeyPrefix,
	hideDetailViewTabs,
	tabsConfig,
	customTabs,
	logsAndTracesInitialExpression,
	eventsInitialExpression,
}: K8sBaseDetailsContentProps<T>): JSX.Element {
	const { timeRange, selectedInterval, handleTimeChange } =
		useEntityDetailsTime();

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

	const [selectedView, setSelectedView] = useInfraMonitoringView();

	const validTabs = useMemo(() => {
		const tabs: string[] = [];
		if (tabVisibility.showMetrics) {
			tabs.push(VIEW_TYPES.METRICS);
		}
		if (tabVisibility.showLogs) {
			tabs.push(VIEW_TYPES.LOGS);
		}
		if (tabVisibility.showTraces) {
			tabs.push(VIEW_TYPES.TRACES);
		}
		if (tabVisibility.showEvents) {
			tabs.push(VIEW_TYPES.EVENTS);
		}
		if (customTabs) {
			tabs.push(...customTabs.map((t) => t.key));
		}
		return tabs;
	}, [tabVisibility, customTabs]);

	useEffect(() => {
		if (!hideDetailViewTabs && !validTabs.includes(selectedView)) {
			const firstValid = validTabs[0] || VIEW_TYPES.METRICS;
			void setSelectedView(firstValid);
		}
	}, [hideDetailViewTabs, selectedView, validTabs, setSelectedView]);

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

	const handleTabChange = (value: string | null): void => {
		if (!value) {
			return;
		}
		void setSelectedView(value);
		void setLogFiltersParam(null);
		void setTracesFiltersParam(null);
		void setEventsFiltersParam(null);
		void logEvent(InfraMonitoringEvents.TabChanged, {
			entity: InfraMonitoringEvents.K8sEntity,
			page: InfraMonitoringEvents.DetailedPage,
			category: eventCategory,
			view: value,
		});
	};

	const handleExplorePagesRedirect = (): void => {
		const urlQuery = new URLSearchParams();

		if (selectedInterval !== 'custom') {
			urlQuery.set(QueryParams.relativeTime, selectedInterval);
		} else {
			urlQuery.delete(QueryParams.relativeTime);
			// Explorer URL params are in milliseconds, timeRange is in seconds
			urlQuery.set(QueryParams.startTime, (timeRange.startTime * 1000).toString());
			urlQuery.set(QueryParams.endTime, (timeRange.endTime * 1000).toString());
		}

		void logEvent(InfraMonitoringEvents.ExploreClicked, {
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
			<div className={styles.entityDetailsEntity}>
				<div className={styles.entityDetailsGrid}>
					<div className={styles.labelsRow}>
						{metadataConfig.map((config) => (
							<Typography.Text
								key={config.label}
								color="muted"
								size="small"
								weight="medium"
								className={styles.entityDetailsMetadataLabel}
							>
								{config.label}
							</Typography.Text>
						))}
					</div>

					<div className={styles.valuesRow}>
						{metadataConfig.map((config) => {
							const value = config.getValue(entity);

							if (config.render) {
								return config.render(value, entity);
							}

							const displayValue = String(value);
							return (
								<Typography.Text
									key={config.label}
									size="small"
									weight="medium"
									className={styles.entityDetailsMetadataValue}
								>
									{displayValue}
								</Typography.Text>
							);
						})}
					</div>
				</div>

				{countsConfig &&
					countsConfig.length > 0 &&
					selectedItem &&
					getCountsFilterExpression && (
						<EntityCountsSection
							entity={entity}
							countsConfig={countsConfig}
							selectedItem={selectedItem}
							filterExpression={getCountsFilterExpression(entity)}
							closeDrawer={handleClose}
						/>
					)}
			</div>

			{!hideDetailViewTabs && (
				<div className={styles.viewsTabsContainer}>
					<ToggleGroupSimple
						type="single"
						className={styles.viewsTabs}
						onChange={handleTabChange}
						value={selectedView}
						items={[
							...(tabVisibility.showMetrics
								? [
										{
											value: VIEW_TYPES.METRICS,
											label: (
												<div className={styles.viewTitle}>
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
												<div className={styles.viewTitle}>
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
												<div className={styles.viewTitle}>
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
												<div className={styles.viewTitle}>
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
									<div className={styles.viewTitle}>
										{tab.icon}
										{tab.label}
									</div>
								),
							})) ?? []),
						]}
					/>

					{selectedView === VIEW_TYPES.LOGS && (
						<TooltipSimple title="Go to Logs Explorer" side="left" arrow>
							<Button
								variant="ghost"
								size="icon"
								color="secondary"
								className={styles.compassButton}
								onClick={handleExplorePagesRedirect}
							>
								<Compass size={18} />
							</Button>
						</TooltipSimple>
					)}
					{selectedView === VIEW_TYPES.TRACES && (
						<TooltipSimple title="Go to Traces Explorer" side="left" arrow>
							<Button
								variant="ghost"
								size="icon"
								color="secondary"
								className={styles.compassButton}
								onClick={handleExplorePagesRedirect}
							>
								<Compass size={18} />
							</Button>
						</TooltipSimple>
					)}
				</div>
			)}

			{effectiveView === VIEW_TYPES.METRICS && (
				<EntityMetrics<T>
					entity={entity}
					eventEntity={eventCategory}
					entityWidgetInfo={entityWidgetInfo}
					getEntityQueryPayload={getEntityQueryPayload}
					category={category}
					queryKey={`${queryKeyPrefix}Metrics`}
				/>
			)}
			{effectiveView === VIEW_TYPES.LOGS && (
				<EntityLogs
					eventEntity={eventCategory}
					queryKey={`${queryKeyPrefix}Logs`}
					category={category}
					initialExpression={logsAndTracesInitialExpression}
				/>
			)}
			{effectiveView === VIEW_TYPES.TRACES && (
				<EntityTraces
					eventEntity={eventCategory}
					queryKey={`${queryKeyPrefix}Traces`}
					category={category}
					initialExpression={logsAndTracesInitialExpression}
				/>
			)}
			{effectiveView === VIEW_TYPES.EVENTS && tabVisibility.showEvents && (
				<EntityEvents
					eventEntity={eventCategory}
					queryKey={`${queryKeyPrefix}Events`}
					initialExpression={eventsInitialExpression}
					category={category}
				/>
			)}
			{customTabs?.map((tab) =>
				selectedView === tab.key ? (
					<Fragment key={tab.key}>
						{tab.render({
							entity,
							timeRange,
							selectedInterval,
							handleTimeChange,
						})}
					</Fragment>
				) : null,
			)}
		</>
	);
}
