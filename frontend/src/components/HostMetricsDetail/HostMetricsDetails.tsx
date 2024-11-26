import './HostMetricsDetail.styles.scss';

import { Color, Spacing } from '@signozhq/design-tokens';
import {
	Button,
	Divider,
	Drawer,
	Progress,
	Radio,
	Tag,
	Typography,
} from 'antd';
import { RadioChangeEvent } from 'antd/lib';
import logEvent from 'api/common/logEvent';
import { QueryParams } from 'constants/query';
import {
	initialQueryBuilderFormValuesMap,
	initialQueryState,
} from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
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
	Package2,
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

import { VIEW_TYPES, VIEWS } from './constants';
import Containers from './Containers/Containers';
import { HostDetailProps } from './HostMetricDetail.interfaces';
import HostMetricLogsDetailedView from './HostMetricsLogs/HostMetricLogsDetailedView';
import HostMetricTraces from './HostMetricTraces/HostMetricTraces';
import Metrics from './Metrics/Metrics';
import Processes from './Processes/Processes';

// eslint-disable-next-line sonarjs/cognitive-complexity
function HostMetricsDetails({
	host,
	onClose,
	isModalTimeSelection,
}: HostDetailProps): JSX.Element {
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
						key: 'host.name',
						dataType: DataTypes.String,
						type: 'resource',
						isColumn: false,
						isJSON: false,
						id: 'host.name--string--resource--false',
					},
					op: '=',
					value: host?.hostName || '',
				},
			],
		}),
		[host?.hostName],
	);

	const [logFilters, setLogFilters] = useState<IBuilderQuery['filters']>(
		initialFilters,
	);

	const [tracesFilters, setTracesFilters] = useState<IBuilderQuery['filters']>(
		initialFilters,
	);

	useEffect(() => {
		logEvent('Infra Monitoring: Hosts list details page visited', {
			host: host?.hostName,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		setLogFilters(initialFilters);
		setTracesFilters(initialFilters);
	}, [initialFilters]);

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

			logEvent('Infra Monitoring: Hosts list details time updated', {
				host: host?.hostName,
				interval,
			});
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);

	const handleChangeLogFilters = useCallback(
		(value: IBuilderQuery['filters']) => {
			setLogFilters((prevFilters) => {
				const hostNameFilter = prevFilters.items.find(
					(item) => item.key?.key === 'host.name',
				);
				const paginationFilter = value.items.find((item) => item.key?.key === 'id');
				const newFilters = value.items.filter(
					(item) => item.key?.key !== 'id' && item.key?.key !== 'host.name',
				);

				logEvent('Infra Monitoring: Hosts list details logs filters applied', {
					host: host?.hostName,
				});

				return {
					op: 'AND',
					items: [
						hostNameFilter,
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
				const hostNameFilter = prevFilters.items.find(
					(item) => item.key?.key === 'host.name',
				);

				logEvent('Infra Monitoring: Hosts list details traces filters applied', {
					host: host?.hostName,
				});

				return {
					op: 'AND',
					items: [
						hostNameFilter,
						...value.items.filter((item) => item.key?.key !== 'host.name'),
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

		logEvent('Infra Monitoring: Hosts list details explore clicked', {
			host: host?.hostName,
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
					<Typography.Text className="title">{host?.hostName}</Typography.Text>
				</>
			}
			placement="right"
			onClose={handleClose}
			open={!!host}
			style={{
				overscrollBehavior: 'contain',
				background: isDarkMode ? Color.BG_INK_400 : Color.BG_VANILLA_100,
			}}
			className="host-detail-drawer"
			destroyOnClose
			closeIcon={<X size={16} style={{ marginTop: Spacing.MARGIN_1 }} />}
		>
			{host && (
				<>
					<div className="host-detail-drawer__host">
						<div className="host-details-grid">
							<div className="labels-row">
								<Typography.Text
									type="secondary"
									className="host-details-metadata-label"
								>
									STATUS
								</Typography.Text>
								<Typography.Text
									type="secondary"
									className="host-details-metadata-label"
								>
									OPERATING SYSTEM
								</Typography.Text>
								<Typography.Text
									type="secondary"
									className="host-details-metadata-label"
								>
									CPU USAGE
								</Typography.Text>
								<Typography.Text
									type="secondary"
									className="host-details-metadata-label"
								>
									MEMORY USAGE
								</Typography.Text>
							</div>

							<div className="values-row">
								<Tag
									bordered
									className={`infra-monitoring-tags ${
										host.active ? 'active' : 'inactive'
									}`}
								>
									{host.active ? 'ACTIVE' : 'INACTIVE'}
								</Tag>
								<Tag className="infra-monitoring-tags" bordered>
									{host.os}
								</Tag>
								<div className="progress-container">
									<Progress
										percent={Number((host.cpu * 100).toFixed(1))}
										size="small"
										strokeColor={((): string => {
											const cpuPercent = Number((host.cpu * 100).toFixed(1));
											if (cpuPercent >= 90) return Color.BG_SAKURA_500;
											if (cpuPercent >= 60) return Color.BG_AMBER_500;
											return Color.BG_FOREST_500;
										})()}
										className="progress-bar"
									/>
								</div>
								<div className="progress-container">
									<Progress
										percent={Number((host.memory * 100).toFixed(1))}
										size="small"
										strokeColor={((): string => {
											const memoryPercent = Number((host.memory * 100).toFixed(1));
											if (memoryPercent >= 90) return Color.BG_CHERRY_500;
											if (memoryPercent >= 60) return Color.BG_AMBER_500;
											return Color.BG_FOREST_500;
										})()}
										className="progress-bar"
									/>
								</div>
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
									selectedView === VIEW_TYPES.CONTAINERS ? 'selected_view tab' : 'tab'
								}
								value={VIEW_TYPES.CONTAINERS}
							>
								<div className="view-title">
									<Package2 size={14} />
									Containers
								</div>
							</Radio.Button>
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
						<Metrics
							selectedInterval={selectedInterval}
							hostName={host.hostName}
							timeRange={modalTimeRange}
							handleTimeChange={handleTimeChange}
							isModalTimeSelection={isModalTimeSelection}
						/>
					)}
					{selectedView === VIEW_TYPES.LOGS && (
						<HostMetricLogsDetailedView
							timeRange={modalTimeRange}
							isModalTimeSelection={isModalTimeSelection}
							handleTimeChange={handleTimeChange}
							handleChangeLogFilters={handleChangeLogFilters}
							logFilters={logFilters}
							selectedInterval={selectedInterval}
						/>
					)}
					{selectedView === VIEW_TYPES.TRACES && (
						<HostMetricTraces
							timeRange={modalTimeRange}
							isModalTimeSelection={isModalTimeSelection}
							handleTimeChange={handleTimeChange}
							handleChangeTracesFilters={handleChangeTracesFilters}
							tracesFilters={tracesFilters}
							selectedInterval={selectedInterval}
						/>
					)}

					{selectedView === VIEW_TYPES.CONTAINERS && <Containers />}
					{selectedView === VIEW_TYPES.PROCESSES && <Processes />}
				</>
			)}
		</Drawer>
	);
}

export default HostMetricsDetails;
