/* eslint-disable sonarjs/no-identical-functions */
import '../../EntityDetailsUtils/entityDetails.styles.scss';

import { Color, Spacing } from '@signozhq/design-tokens';
import { Button, Divider, Drawer, Radio, Tooltip, Typography } from 'antd';
import { RadioChangeEvent } from 'antd/lib';
import logEvent from 'api/common/logEvent';
import { VIEW_TYPES, VIEWS } from 'components/HostMetricsDetail/constants';
import { QueryParams } from 'constants/query';
import {
	initialQueryBuilderFormValuesMap,
	initialQueryState,
} from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { K8sCategory } from 'container/InfraMonitoringK8s/constants';
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
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
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

import DaemonSetEvents from '../../EntityDetailsUtils/EntityEvents';
import DaemonSetLogs from '../../EntityDetailsUtils/EntityLogs';
import DaemonSetMetrics from '../../EntityDetailsUtils/EntityMetrics';
import DaemonSetTraces from '../../EntityDetailsUtils/EntityTraces';
import { QUERY_KEYS } from '../../EntityDetailsUtils/utils';
import {
	daemonSetWidgetInfo,
	getDaemonSetMetricsQueryPayload,
} from './constants';
import { DaemonSetDetailsProps } from './DaemonSetDetails.interfaces';

function DaemonSetDetails({
	daemonSet,
	onClose,
	isModalTimeSelection,
}: DaemonSetDetailsProps): JSX.Element {
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

	const [selectedInterval, setSelectedInterval] = useState<Time>(
		selectedTime as Time,
	);

	const [selectedView, setSelectedView] = useState<VIEWS>(VIEWS.METRICS);
	const isDarkMode = useIsDarkMode();

	const initialFilters = useMemo(
		() => ({
			op: 'AND',
			items: [
				{
					id: uuidv4(),
					key: {
						key: QUERY_KEYS.K8S_DAEMON_SET_NAME,
						dataType: DataTypes.String,
						type: 'resource',
						isColumn: false,
						isJSON: false,
						id: 'k8s_daemonSet_name--string--resource--false',
					},
					op: '=',
					value: daemonSet?.meta.k8s_daemonset_name || '',
				},
				{
					id: uuidv4(),
					key: {
						key: QUERY_KEYS.K8S_NAMESPACE_NAME,
						dataType: DataTypes.String,
						type: 'resource',
						isColumn: false,
						isJSON: false,
						id: 'k8s_daemonSet_name--string--resource--false',
					},
					op: '=',
					value: daemonSet?.meta.k8s_namespace_name || '',
				},
			],
		}),
		[daemonSet?.meta.k8s_daemonset_name, daemonSet?.meta.k8s_namespace_name],
	);

	const initialEventsFilters = useMemo(
		() => ({
			op: 'AND',
			items: [
				{
					id: uuidv4(),
					key: {
						key: QUERY_KEYS.K8S_OBJECT_KIND,
						dataType: DataTypes.String,
						type: 'resource',
						isColumn: false,
						isJSON: false,
						id: 'k8s.object.kind--string--resource--false',
					},
					op: '=',
					value: 'DaemonSet',
				},
				{
					id: uuidv4(),
					key: {
						key: QUERY_KEYS.K8S_OBJECT_NAME,
						dataType: DataTypes.String,
						type: 'resource',
						isColumn: false,
						isJSON: false,
						id: 'k8s.object.name--string--resource--false',
					},
					op: '=',
					value: daemonSet?.meta.k8s_daemonset_name || '',
				},
			],
		}),
		[daemonSet?.meta.k8s_daemonset_name],
	);

	const [logFilters, setLogFilters] = useState<IBuilderQuery['filters']>(
		initialFilters,
	);

	const [tracesFilters, setTracesFilters] = useState<IBuilderQuery['filters']>(
		initialFilters,
	);

	const [eventsFilters, setEventsFilters] = useState<IBuilderQuery['filters']>(
		initialEventsFilters,
	);

	useEffect(() => {
		logEvent('Infra Monitoring: DaemonSets list details page visited', {
			daemonSet: daemonSet?.daemonSetName,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		setLogFilters(initialFilters);
		setTracesFilters(initialFilters);
		setEventsFilters(initialEventsFilters);
	}, [initialFilters, initialEventsFilters]);

	useEffect(() => {
		setSelectedInterval(selectedTime as Time);

		if (selectedTime !== 'custom') {
			const { maxTime, minTime } = GetMinMax(selectedTime);

			setModalTimeRange({
				startTime: Math.floor(minTime / 1000000000),
				endTime: Math.floor(maxTime / 1000000000),
			});
		}
	}, [selectedTime, minTime, maxTime]);

	const handleTabChange = (e: RadioChangeEvent): void => {
		setSelectedView(e.target.value);
	};

	const handleTimeChange = useCallback(
		(interval: Time | CustomTimeType, dateTimeRange?: [number, number]): void => {
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

			logEvent('Infra Monitoring: DaemonSets list details time updated', {
				daemonSet: daemonSet?.daemonSetName,
				interval,
			});
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);

	const handleChangeLogFilters = useCallback(
		(value: IBuilderQuery['filters']) => {
			setLogFilters((prevFilters) => {
				const primaryFilters = prevFilters.items.filter((item) =>
					[QUERY_KEYS.K8S_DAEMON_SET_NAME, QUERY_KEYS.K8S_NAMESPACE_NAME].includes(
						item.key?.key ?? '',
					),
				);
				const paginationFilter = value.items.find((item) => item.key?.key === 'id');
				const newFilters = value.items.filter(
					(item) =>
						item.key?.key !== 'id' &&
						item.key?.key !== QUERY_KEYS.K8S_DAEMON_SET_NAME,
				);

				logEvent('Infra Monitoring: DaemonSets list details logs filters applied', {
					daemonSet: daemonSet?.daemonSetName,
				});

				return {
					op: 'AND',
					items: [
						...primaryFilters,
						...newFilters,
						...(paginationFilter ? [paginationFilter] : []),
					].filter((item): item is TagFilterItem => item !== undefined),
				};
			});
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);

	const handleChangeTracesFilters = useCallback(
		(value: IBuilderQuery['filters']) => {
			setTracesFilters((prevFilters) => {
				const primaryFilters = prevFilters.items.filter((item) =>
					[QUERY_KEYS.K8S_DAEMON_SET_NAME, QUERY_KEYS.K8S_NAMESPACE_NAME].includes(
						item.key?.key ?? '',
					),
				);

				logEvent(
					'Infra Monitoring: DaemonSets list details traces filters applied',
					{
						daemonSet: daemonSet?.daemonSetName,
					},
				);

				return {
					op: 'AND',
					items: [
						...primaryFilters,
						...value.items.filter(
							(item) => item.key?.key !== QUERY_KEYS.K8S_DAEMON_SET_NAME,
						),
					].filter((item): item is TagFilterItem => item !== undefined),
				};
			});
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);

	const handleChangeEventsFilters = useCallback(
		(value: IBuilderQuery['filters']) => {
			setEventsFilters((prevFilters) => {
				const daemonSetKindFilter = prevFilters.items.find(
					(item) => item.key?.key === QUERY_KEYS.K8S_OBJECT_KIND,
				);
				const daemonSetNameFilter = prevFilters.items.find(
					(item) => item.key?.key === QUERY_KEYS.K8S_OBJECT_NAME,
				);

				logEvent(
					'Infra Monitoring: DaemonSets list details events filters applied',
					{
						daemonSet: daemonSet?.daemonSetName,
					},
				);

				return {
					op: 'AND',
					items: [
						daemonSetKindFilter,
						daemonSetNameFilter,
						...value.items.filter(
							(item) =>
								item.key?.key !== QUERY_KEYS.K8S_OBJECT_KIND &&
								item.key?.key !== QUERY_KEYS.K8S_OBJECT_NAME,
						),
					].filter((item): item is TagFilterItem => item !== undefined),
				};
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

		logEvent('Infra Monitoring: DaemonSets list details explore clicked', {
			daemonSet: daemonSet?.daemonSetName,
			view: selectedView,
		});

		if (selectedView === VIEW_TYPES.LOGS) {
			const filtersWithoutPagination = {
				...logFilters,
				items: logFilters.items.filter((item) => item.key?.key !== 'id'),
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
							filters: tracesFilters,
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
						{daemonSet?.meta.k8s_daemonset_name}
					</Typography.Text>
				</>
			}
			placement="right"
			onClose={handleClose}
			open={!!daemonSet}
			style={{
				overscrollBehavior: 'contain',
				background: isDarkMode ? Color.BG_INK_400 : Color.BG_VANILLA_100,
			}}
			className="entity-detail-drawer"
			destroyOnClose
			closeIcon={<X size={16} style={{ marginTop: Spacing.MARGIN_1 }} />}
		>
			{daemonSet && (
				<>
					<div className="entity-detail-drawer__entity">
						<div className="entity-details-grid">
							<div className="labels-row">
								<Typography.Text
									type="secondary"
									className="entity-details-metadata-label"
								>
									Daemonset Name
								</Typography.Text>
								<Typography.Text
									type="secondary"
									className="entity-details-metadata-label"
								>
									Cluster Name
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
									<Tooltip title={daemonSet.meta.k8s_daemonset_name}>
										{daemonSet.meta.k8s_daemonset_name}
									</Tooltip>
								</Typography.Text>
								<Typography.Text className="entity-details-metadata-value">
									<Tooltip title={daemonSet.meta.k8s_cluster_name}>
										{daemonSet.meta.k8s_cluster_name}
									</Tooltip>
								</Typography.Text>
								<Typography.Text className="entity-details-metadata-value">
									<Tooltip title={daemonSet.meta.k8s_namespace_name}>
										{daemonSet.meta.k8s_namespace_name}
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
						<DaemonSetMetrics
							timeRange={modalTimeRange}
							isModalTimeSelection={isModalTimeSelection}
							handleTimeChange={handleTimeChange}
							selectedInterval={selectedInterval}
							entity={daemonSet}
							entityWidgetInfo={daemonSetWidgetInfo}
							getEntityQueryPayload={getDaemonSetMetricsQueryPayload}
							category={K8sCategory.DAEMONSETS}
							queryKey="daemonsetMetrics"
						/>
					)}
					{selectedView === VIEW_TYPES.LOGS && (
						<DaemonSetLogs
							timeRange={modalTimeRange}
							isModalTimeSelection={isModalTimeSelection}
							handleTimeChange={handleTimeChange}
							handleChangeLogFilters={handleChangeLogFilters}
							logFilters={logFilters}
							selectedInterval={selectedInterval}
							category={K8sCategory.DAEMONSETS}
							queryKey="daemonsetLogs"
							queryKeyFilters={[
								QUERY_KEYS.K8S_DAEMON_SET_NAME,
								QUERY_KEYS.K8S_NAMESPACE_NAME,
							]}
						/>
					)}
					{selectedView === VIEW_TYPES.TRACES && (
						<DaemonSetTraces
							timeRange={modalTimeRange}
							isModalTimeSelection={isModalTimeSelection}
							handleTimeChange={handleTimeChange}
							handleChangeTracesFilters={handleChangeTracesFilters}
							tracesFilters={tracesFilters}
							selectedInterval={selectedInterval}
							queryKey="daemonsetTraces"
						/>
					)}
					{selectedView === VIEW_TYPES.EVENTS && (
						<DaemonSetEvents
							timeRange={modalTimeRange}
							handleChangeEventFilters={handleChangeEventsFilters}
							filters={eventsFilters}
							isModalTimeSelection={isModalTimeSelection}
							handleTimeChange={handleTimeChange}
							selectedInterval={selectedInterval}
							queryKey="daemonsetEvents"
							category={K8sCategory.DAEMONSETS}
						/>
					)}
				</>
			)}
		</Drawer>
	);
}

export default DaemonSetDetails;
