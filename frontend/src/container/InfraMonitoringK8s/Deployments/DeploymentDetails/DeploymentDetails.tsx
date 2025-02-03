/* eslint-disable sonarjs/no-identical-functions */
import '../../EntityDetailsUtils/entityDetails.styles.scss';

import { Color, Spacing } from '@signozhq/design-tokens';
import { Button, Divider, Drawer, Radio, Tooltip, Typography } from 'antd';
import { RadioChangeEvent } from 'antd/lib';
import logEvent from 'api/common/logEvent';
import { K8sDeploymentsData } from 'api/infraMonitoring/getK8sDeploymentsList';
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

import DeploymentEvents from '../../EntityDetailsUtils/EntityEvents';
import DeploymentLogs from '../../EntityDetailsUtils/EntityLogs';
import DeploymentMetrics from '../../EntityDetailsUtils/EntityMetrics';
import DeploymentTraces from '../../EntityDetailsUtils/EntityTraces';
import {
	deploymentWidgetInfo,
	getDeploymentMetricsQueryPayload,
} from './constants';
import { DeploymentDetailsProps } from './DeploymentDetails.interfaces';

function DeploymentDetails({
	deployment,
	onClose,
	isModalTimeSelection,
}: DeploymentDetailsProps): JSX.Element {
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
						key: QUERY_KEYS.K8S_DEPLOYMENT_NAME,
						dataType: DataTypes.String,
						type: 'resource',
						isColumn: false,
						isJSON: false,
						id: 'k8s_deployment_name--string--resource--false',
					},
					op: '=',
					value: deployment?.meta.k8s_deployment_name || '',
				},
				{
					id: uuidv4(),
					key: {
						key: QUERY_KEYS.K8S_NAMESPACE_NAME,
						dataType: DataTypes.String,
						type: 'resource',
						isColumn: false,
						isJSON: false,
						id: 'k8s_deployment_name--string--resource--false',
					},
					op: '=',
					value: deployment?.meta.k8s_namespace_name || '',
				},
			],
		}),
		[deployment?.meta.k8s_deployment_name, deployment?.meta.k8s_namespace_name],
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
					value: 'Deployment',
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
					value: deployment?.meta.k8s_deployment_name || '',
				},
			],
		}),
		[deployment?.meta.k8s_deployment_name],
	);

	const [logAndTracesFilters, setLogAndTracesFilters] = useState<
		IBuilderQuery['filters']
	>(initialFilters);

	const [eventsFilters, setEventsFilters] = useState<IBuilderQuery['filters']>(
		initialEventsFilters,
	);

	useEffect(() => {
		logEvent('Infra Monitoring: Deployments list details page visited', {
			deployment: deployment?.deploymentName,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		setLogAndTracesFilters(initialFilters);
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
		logEvent('Infra Monitoring: Deployments list details tab changed', {
			deployment: deployment?.deploymentName,
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
					startTime: Math.floor(minTime / 1000000000),
					endTime: Math.floor(maxTime / 1000000000),
				});
			}

			logEvent('Infra Monitoring: Deployments list details time updated', {
				deployment: deployment?.deploymentName,
				interval,
				view: selectedView,
			});
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);

	const handleChangeLogFilters = useCallback(
		(value: IBuilderQuery['filters']) => {
			setLogAndTracesFilters((prevFilters) => {
				const primaryFilters = prevFilters.items.filter((item) =>
					[QUERY_KEYS.K8S_DEPLOYMENT_NAME, QUERY_KEYS.K8S_NAMESPACE_NAME].includes(
						item.key?.key ?? '',
					),
				);
				const paginationFilter = value.items.find((item) => item.key?.key === 'id');
				const newFilters = value.items.filter(
					(item) =>
						item.key?.key !== 'id' &&
						item.key?.key !== QUERY_KEYS.K8S_DEPLOYMENT_NAME,
				);

				logEvent(
					'Infra Monitoring: Deployments list details logs filters applied',
					{
						deployment: deployment?.deploymentName,
					},
				);

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
			setLogAndTracesFilters((prevFilters) => {
				const primaryFilters = prevFilters.items.filter((item) =>
					[QUERY_KEYS.K8S_DEPLOYMENT_NAME, QUERY_KEYS.K8S_NAMESPACE_NAME].includes(
						item.key?.key ?? '',
					),
				);

				logEvent(
					'Infra Monitoring: Deployments list details traces filters applied',
					{
						deployment: deployment?.deploymentName,
					},
				);

				return {
					op: 'AND',
					items: filterDuplicateFilters(
						[
							...primaryFilters,
							...value.items.filter(
								(item) => item.key?.key !== QUERY_KEYS.K8S_DEPLOYMENT_NAME,
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
				const deploymentKindFilter = prevFilters.items.find(
					(item) => item.key?.key === QUERY_KEYS.K8S_OBJECT_KIND,
				);
				const deploymentNameFilter = prevFilters.items.find(
					(item) => item.key?.key === QUERY_KEYS.K8S_OBJECT_NAME,
				);

				logEvent(
					'Infra Monitoring: Deployments list details events filters applied',
					{
						deployment: deployment?.deploymentName,
					},
				);

				return {
					op: 'AND',
					items: filterDuplicateFilters(
						[
							deploymentKindFilter,
							deploymentNameFilter,
							...value.items.filter(
								(item) =>
									item.key?.key !== QUERY_KEYS.K8S_OBJECT_KIND &&
									item.key?.key !== QUERY_KEYS.K8S_OBJECT_NAME,
							),
						].filter((item): item is TagFilterItem => item !== undefined),
					),
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

		logEvent('Infra Monitoring: Deployments list details explore clicked', {
			deployment: deployment?.deploymentName,
			view: selectedView,
		});

		if (selectedView === VIEW_TYPES.LOGS) {
			const filtersWithoutPagination = {
				...logAndTracesFilters,
				items: logAndTracesFilters.items.filter((item) => item.key?.key !== 'id'),
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
							filters: logAndTracesFilters,
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
						{deployment?.meta.k8s_deployment_name}
					</Typography.Text>
				</>
			}
			placement="right"
			onClose={handleClose}
			open={!!deployment}
			style={{
				overscrollBehavior: 'contain',
				background: isDarkMode ? Color.BG_INK_400 : Color.BG_VANILLA_100,
			}}
			className="entity-detail-drawer"
			destroyOnClose
			closeIcon={<X size={16} style={{ marginTop: Spacing.MARGIN_1 }} />}
		>
			{deployment && (
				<>
					<div className="entity-detail-drawer__entity">
						<div className="entity-details-grid">
							<div className="labels-row">
								<Typography.Text
									type="secondary"
									className="entity-details-metadata-label"
								>
									Deployment Name
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
									<Tooltip title={deployment.meta.k8s_deployment_name}>
										{deployment.meta.k8s_deployment_name}
									</Tooltip>
								</Typography.Text>
								<Typography.Text className="entity-details-metadata-value">
									<Tooltip title={deployment.meta.k8s_cluster_name}>
										{deployment.meta.k8s_cluster_name}
									</Tooltip>
								</Typography.Text>
								<Typography.Text className="entity-details-metadata-value">
									<Tooltip title={deployment.meta.k8s_namespace_name}>
										{deployment.meta.k8s_namespace_name}
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
						<DeploymentMetrics<K8sDeploymentsData>
							timeRange={modalTimeRange}
							isModalTimeSelection={isModalTimeSelection}
							handleTimeChange={handleTimeChange}
							selectedInterval={selectedInterval}
							entity={deployment}
							entityWidgetInfo={deploymentWidgetInfo}
							getEntityQueryPayload={getDeploymentMetricsQueryPayload}
							category={K8sCategory.DEPLOYMENTS}
							queryKey="deploymentMetrics"
						/>
					)}
					{selectedView === VIEW_TYPES.LOGS && (
						<DeploymentLogs
							timeRange={modalTimeRange}
							isModalTimeSelection={isModalTimeSelection}
							handleTimeChange={handleTimeChange}
							handleChangeLogFilters={handleChangeLogFilters}
							logFilters={logAndTracesFilters}
							selectedInterval={selectedInterval}
							queryKeyFilters={[
								QUERY_KEYS.K8S_DEPLOYMENT_NAME,
								QUERY_KEYS.K8S_NAMESPACE_NAME,
							]}
							queryKey="deploymentLogs"
							category={K8sCategory.DEPLOYMENTS}
						/>
					)}
					{selectedView === VIEW_TYPES.TRACES && (
						<DeploymentTraces
							timeRange={modalTimeRange}
							isModalTimeSelection={isModalTimeSelection}
							handleTimeChange={handleTimeChange}
							handleChangeTracesFilters={handleChangeTracesFilters}
							tracesFilters={logAndTracesFilters}
							selectedInterval={selectedInterval}
							queryKey="deploymentTraces"
							queryKeyFilters={[
								QUERY_KEYS.K8S_DEPLOYMENT_NAME,
								QUERY_KEYS.K8S_NAMESPACE_NAME,
							]}
						/>
					)}
					{selectedView === VIEW_TYPES.EVENTS && (
						<DeploymentEvents
							timeRange={modalTimeRange}
							handleChangeEventFilters={handleChangeEventsFilters}
							filters={eventsFilters}
							isModalTimeSelection={isModalTimeSelection}
							handleTimeChange={handleTimeChange}
							selectedInterval={selectedInterval}
							category={K8sCategory.DEPLOYMENTS}
							queryKey="deploymentEvents"
						/>
					)}
				</>
			)}
		</Drawer>
	);
}

export default DeploymentDetails;
