/* eslint-disable sonarjs/no-identical-functions */
/* eslint-disable sonarjs/no-duplicate-string */
import '../../EntityDetailsUtils/entityDetails.styles.scss';

import { Color, Spacing } from '@signozhq/design-tokens';
import { Button, Divider, Drawer, Radio, Tooltip, Typography } from 'antd';
import { RadioChangeEvent } from 'antd/lib';
import logEvent from 'api/common/logEvent';
import { K8sPodsData } from 'api/infraMonitoring/getK8sPodsList';
import { VIEW_TYPES, VIEWS } from 'components/HostMetricsDetail/constants';
import { QueryParams } from 'constants/query';
import {
	initialQueryBuilderFormValuesMap,
	initialQueryState,
} from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { filterDuplicateFilters } from 'container/InfraMonitoringK8s/commonUtils';
import { K8sCategory } from 'container/InfraMonitoringK8s/constants';
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

import PodEvents from '../../EntityDetailsUtils/EntityEvents';
import PodLogs from '../../EntityDetailsUtils/EntityLogs';
import PodMetrics from '../../EntityDetailsUtils/EntityMetrics';
import PodTraces from '../../EntityDetailsUtils/EntityTraces';
import { getPodMetricsQueryPayload, podWidgetInfo } from './constants';
import { PodDetailProps } from './PodDetail.interfaces';

const TimeRangeOffset = 1000000000;

// eslint-disable-next-line sonarjs/cognitive-complexity
function PodDetails({
	pod,
	onClose,
	isModalTimeSelection,
}: PodDetailProps): JSX.Element {
	const { maxTime, minTime, selectedTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const startMs = useMemo(() => Math.floor(Number(minTime) / TimeRangeOffset), [
		minTime,
	]);
	const endMs = useMemo(() => Math.floor(Number(maxTime) / TimeRangeOffset), [
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
						key: QUERY_KEYS.K8S_POD_NAME,
						dataType: DataTypes.String,
						type: 'resource',
						isColumn: false,
						isJSON: false,
						id: 'k8s_pod_name--string--resource--false',
					},
					op: '=',
					value: pod?.meta.k8s_pod_name || '',
				},
				{
					id: uuidv4(),
					key: {
						key: QUERY_KEYS.K8S_NAMESPACE_NAME,
						dataType: DataTypes.String,
						type: 'resource',
						isColumn: false,
						isJSON: false,
						id: 'k8s_pod_name--string--resource--false',
					},
					op: '=',
					value: pod?.meta.k8s_namespace_name || '',
				},
			],
		}),
		[pod?.meta.k8s_namespace_name, pod?.meta.k8s_pod_name],
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
					value: 'Pod',
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
					value: pod?.meta.k8s_pod_name || '',
				},
			],
		}),
		[pod?.meta.k8s_pod_name],
	);

	const [logsAndTracesFilters, setLogsAndTracesFilters] = useState<
		IBuilderQuery['filters']
	>(initialFilters);

	const [eventsFilters, setEventsFilters] = useState<IBuilderQuery['filters']>(
		initialEventsFilters,
	);

	useEffect(() => {
		logEvent('Infra Monitoring: Pods list details page visited', {
			pod: pod?.podUID,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		setLogsAndTracesFilters(initialFilters);
		setEventsFilters(initialEventsFilters);
	}, [initialFilters, initialEventsFilters]);

	useEffect(() => {
		setSelectedInterval(selectedTime as Time);

		if (selectedTime !== 'custom') {
			const { maxTime, minTime } = GetMinMax(selectedTime);

			setModalTimeRange({
				startTime: Math.floor(minTime / TimeRangeOffset),
				endTime: Math.floor(maxTime / TimeRangeOffset),
			});
		}
	}, [selectedTime, minTime, maxTime]);

	const handleTabChange = (e: RadioChangeEvent): void => {
		setSelectedView(e.target.value);
		logEvent('Infra Monitoring: Pods list details tab changed', {
			pod: pod?.podUID,
			view: e.target.value,
		});
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
					startTime: Math.floor(minTime / TimeRangeOffset),
					endTime: Math.floor(maxTime / TimeRangeOffset),
				});
			}

			logEvent('Infra Monitoring: Pods list details time updated', {
				pod: pod?.podUID,
				interval,
				view: selectedView,
			});
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);

	const handleChangeLogFilters = useCallback(
		(value: IBuilderQuery['filters']) => {
			setLogsAndTracesFilters((prevFilters) => {
				const primaryFilters = prevFilters.items.filter((item) =>
					[
						QUERY_KEYS.K8S_POD_NAME,
						QUERY_KEYS.K8S_CLUSTER_NAME,
						QUERY_KEYS.K8S_NAMESPACE_NAME,
					].includes(item.key?.key ?? ''),
				);
				const paginationFilter = value.items.find((item) => item.key?.key === 'id');
				const newFilters = value.items.filter(
					(item) =>
						item.key?.key !== 'id' && item.key?.key !== QUERY_KEYS.K8S_CLUSTER_NAME,
				);

				logEvent('Infra Monitoring: Pods list details logs filters applied', {
					pod: pod?.podUID,
				});

				return {
					op: 'AND',
					items: filterDuplicateFilters(
						[
							...primaryFilters,
							...newFilters,
							...(paginationFilter ? [paginationFilter] : []),
						].filter((item): item is TagFilterItem => item !== undefined),
					),
				};
			});
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);

	const handleChangeTracesFilters = useCallback(
		(value: IBuilderQuery['filters']) => {
			setLogsAndTracesFilters((prevFilters) => {
				const primaryFilters = prevFilters.items.filter((item) =>
					[
						QUERY_KEYS.K8S_POD_NAME,
						QUERY_KEYS.K8S_CLUSTER_NAME,
						QUERY_KEYS.K8S_NAMESPACE_NAME,
					].includes(item.key?.key ?? ''),
				);

				logEvent('Infra Monitoring: Pods list details traces filters applied', {
					pod: pod?.podUID,
				});

				return {
					op: 'AND',
					items: filterDuplicateFilters(
						[
							...primaryFilters,
							...value.items.filter(
								(item) => item.key?.key !== QUERY_KEYS.K8S_POD_NAME,
							),
						].filter((item): item is TagFilterItem => item !== undefined),
					),
				};
			});
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);

	const handleChangeEventsFilters = useCallback(
		(value: IBuilderQuery['filters']) => {
			setEventsFilters((prevFilters) => {
				const podKindFilter = prevFilters.items.find(
					(item) => item.key?.key === QUERY_KEYS.K8S_OBJECT_KIND,
				);
				const podNameFilter = prevFilters.items.find(
					(item) => item.key?.key === QUERY_KEYS.K8S_OBJECT_NAME,
				);

				logEvent('Infra Monitoring: Pods list details events filters applied', {
					pod: pod?.podUID,
				});

				return {
					op: 'AND',
					items: [
						podKindFilter,
						podNameFilter,
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

		logEvent('Infra Monitoring: Pods list details explore clicked', {
			pod: pod?.podUID,
			view: selectedView,
		});

		if (selectedView === VIEW_TYPES.LOGS) {
			const filtersWithoutPagination = {
				...logsAndTracesFilters,
				items: logsAndTracesFilters.items.filter((item) => item.key?.key !== 'id'),
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
		setSelectedInterval(selectedTime as Time);

		if (selectedTime !== 'custom') {
			const { maxTime, minTime } = GetMinMax(selectedTime);

			setModalTimeRange({
				startTime: Math.floor(minTime / TimeRangeOffset),
				endTime: Math.floor(maxTime / TimeRangeOffset),
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
						{pod?.meta.k8s_pod_name}
					</Typography.Text>
				</>
			}
			placement="right"
			onClose={handleClose}
			open={!!pod}
			style={{
				overscrollBehavior: 'contain',
				background: isDarkMode ? Color.BG_INK_400 : Color.BG_VANILLA_100,
			}}
			className="entity-detail-drawer"
			destroyOnClose
			closeIcon={<X size={16} style={{ marginTop: Spacing.MARGIN_1 }} />}
		>
			{pod && (
				<>
					<div className="entity-detail-drawer__entity">
						<div className="entity-details-grid">
							<div className="labels-row">
								<Typography.Text
									type="secondary"
									className="entity-details-metadata-label"
								>
									NAMESPACE
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
									Node
								</Typography.Text>
							</div>

							<div className="values-row">
								<Typography.Text className="entity-details-metadata-value">
									<Tooltip title={pod.meta.k8s_namespace_name}>
										{pod.meta.k8s_namespace_name}
									</Tooltip>
								</Typography.Text>

								<Typography.Text className="entity-details-metadata-value">
									<Tooltip title={pod.meta.k8s_cluster_name}>
										{pod.meta.k8s_cluster_name}
									</Tooltip>
								</Typography.Text>

								<Typography.Text className="entity-details-metadata-value">
									<Tooltip title={pod.meta.k8s_node_name}>
										{pod.meta.k8s_node_name}
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
						<PodMetrics<K8sPodsData>
							entity={pod}
							selectedInterval={selectedInterval}
							timeRange={modalTimeRange}
							handleTimeChange={handleTimeChange}
							isModalTimeSelection={isModalTimeSelection}
							entityWidgetInfo={podWidgetInfo}
							getEntityQueryPayload={getPodMetricsQueryPayload}
							category={K8sCategory.PODS}
							queryKey="podMetrics"
						/>
					)}
					{selectedView === VIEW_TYPES.LOGS && (
						<PodLogs
							timeRange={modalTimeRange}
							isModalTimeSelection={isModalTimeSelection}
							handleTimeChange={handleTimeChange}
							handleChangeLogFilters={handleChangeLogFilters}
							logFilters={logsAndTracesFilters}
							selectedInterval={selectedInterval}
							queryKeyFilters={[
								QUERY_KEYS.K8S_POD_NAME,
								QUERY_KEYS.K8S_CLUSTER_NAME,
								QUERY_KEYS.K8S_NAMESPACE_NAME,
							]}
							queryKey="podLogs"
							category={K8sCategory.PODS}
						/>
					)}
					{selectedView === VIEW_TYPES.TRACES && (
						<PodTraces
							timeRange={modalTimeRange}
							isModalTimeSelection={isModalTimeSelection}
							handleTimeChange={handleTimeChange}
							handleChangeTracesFilters={handleChangeTracesFilters}
							tracesFilters={logsAndTracesFilters}
							selectedInterval={selectedInterval}
							queryKey="podTraces"
							queryKeyFilters={[
								QUERY_KEYS.K8S_POD_NAME,
								QUERY_KEYS.K8S_CLUSTER_NAME,
								QUERY_KEYS.K8S_NAMESPACE_NAME,
							]}
						/>
					)}

					{selectedView === VIEW_TYPES.EVENTS && (
						<PodEvents
							timeRange={modalTimeRange}
							isModalTimeSelection={isModalTimeSelection}
							handleTimeChange={handleTimeChange}
							handleChangeEventFilters={handleChangeEventsFilters}
							filters={eventsFilters}
							selectedInterval={selectedInterval}
							category={K8sCategory.PODS}
							queryKey="podEvents"
						/>
					)}
				</>
			)}
		</Drawer>
	);
}

export default PodDetails;
