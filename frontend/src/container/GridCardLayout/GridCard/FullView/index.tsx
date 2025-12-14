/* eslint-disable sonarjs/cognitive-complexity */
import './WidgetFullView.styles.scss';

import {
	LoadingOutlined,
	SearchOutlined,
	SyncOutlined,
} from '@ant-design/icons';
import { Button, Input, Spin } from 'antd';
import cx from 'classnames';
import { ToggleGraphProps } from 'components/Graph/types';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { QueryBuilderV2 } from 'components/QueryBuilderV2/QueryBuilderV2';
import Spinner from 'components/Spinner';
import TimePreference from 'components/TimePreferenceDropDown';
import WarningPopover from 'components/WarningPopover/WarningPopover';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import useDrilldown from 'container/GridCardLayout/GridCard/FullView/useDrilldown';
import { populateMultipleResults } from 'container/NewWidget/LeftContainer/WidgetGraph/util';
import {
	timeItems,
	timePreferance,
} from 'container/NewWidget/RightContainer/timeItems';
import PanelWrapper from 'container/PanelWrapper/PanelWrapper';
import RightToolbarActions from 'container/QueryBuilder/components/ToolbarActions/RightToolbarActions';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useChartMutable } from 'hooks/useChartMutable';
import useComponentPermission from 'hooks/useComponentPermission';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import { getDashboardVariables } from 'lib/dashbaordVariables/getDashboardVariables';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import GetMinMax from 'lib/getMinMax';
import { isEmpty } from 'lodash-es';
import { useAppContext } from 'providers/App/App';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { Warning } from 'types/api';
import { GlobalReducer } from 'types/reducer/globalTime';
import { getGraphType } from 'utils/getGraphType';
import { getSortedSeriesData } from 'utils/getSortedSeriesData';

import { getLocalStorageGraphVisibilityState } from '../utils';
import { PANEL_TYPES_VS_FULL_VIEW_TABLE } from './contants';
import PanelTypeSelector from './PanelTypeSelector';
import { GraphContainer, TimeContainer } from './styles';
import { FullViewProps } from './types';

function FullView({
	widget,
	fullViewOptions = true,
	version,
	originalName,
	tableProcessedDataRef,
	isDependedDataLoaded = false,
	onToggleModelHandler,
	onClickHandler,
	customOnDragSelect,
	setCurrentGraphRef,
	enableDrillDown = false,
}: FullViewProps): JSX.Element {
	const { safeNavigate } = useSafeNavigate();
	const { selectedTime: globalSelectedTime, minTime, maxTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);
	const urlQuery = useUrlQuery();

	const fullViewRef = useRef<HTMLDivElement>(null);
	const { handleRunQuery } = useQueryBuilder();

	useEffect(() => {
		setCurrentGraphRef(fullViewRef);
	}, [setCurrentGraphRef]);

	const { selectedDashboard, isDashboardLocked } = useDashboard();
	const { user } = useAppContext();

	const [editWidget] = useComponentPermission(['edit_widget'], user.role);

	const getSelectedTime = useCallback(
		() =>
			timeItems.find((e) => e.enum === (widget?.timePreferance || 'GLOBAL_TIME')),
		[widget],
	);

	const fullViewChartRef = useRef<ToggleGraphProps>();

	const [selectedTime, setSelectedTime] = useState<timePreferance>({
		name: getSelectedTime()?.name || '',
		enum: widget?.timePreferance || 'GLOBAL_TIME',
	});

	const updatedQuery = widget?.query;

	// Panel type derived from URL with fallback to widget setting
	const selectedPanelType = useMemo(() => {
		const urlPanelType = urlQuery.get(QueryParams.graphType) as PANEL_TYPES;
		if (urlPanelType && Object.values(PANEL_TYPES).includes(urlPanelType)) {
			return urlPanelType;
		}
		return widget?.panelTypes || PANEL_TYPES.TIME_SERIES;
	}, [urlQuery, widget?.panelTypes]);

	const [requestData, setRequestData] = useState<GetQueryResultsProps>(() => {
		if (selectedPanelType !== PANEL_TYPES.LIST) {
			return {
				selectedTime: selectedTime.enum,
				graphType: getGraphType(selectedPanelType),
				query: updatedQuery,
				globalSelectedInterval: globalSelectedTime,
				variables: getDashboardVariables(selectedDashboard?.data.variables),
				fillGaps: widget.fillSpans,
				formatForWeb: selectedPanelType === PANEL_TYPES.TABLE,
				originalGraphType: selectedPanelType,
			};
		}
		updatedQuery.builder.queryData[0].pageSize = 10;
		return {
			query: updatedQuery,
			graphType: PANEL_TYPES.LIST,
			selectedTime: widget?.timePreferance || 'GLOBAL_TIME',
			globalSelectedInterval: globalSelectedTime,
			variables: getDashboardVariables(selectedDashboard?.data.variables),
			tableParams: {
				pagination: {
					offset: 0,
					limit: updatedQuery.builder.queryData[0].limit || 0,
				},
			},
		};
	});

	const {
		drilldownQuery,
		dashboardEditView,
		handleResetQuery,
		showResetQuery,
	} = useDrilldown({
		enableDrillDown,
		widget,
		setRequestData,
		selectedDashboard,
		selectedPanelType,
	});

	useEffect(() => {
		const timeRange =
			selectedTime.enum !== 'GLOBAL_TIME'
				? { start: undefined, end: undefined }
				: { start: Math.floor(minTime / 1e9), end: Math.floor(maxTime / 1e9) };
		setRequestData((prev) => ({
			...prev,
			selectedTime: selectedTime.enum,
			...timeRange,
		}));
	}, [selectedTime, minTime, maxTime]);

	// Update requestData when panel type changes
	useEffect(() => {
		setRequestData((prev) => {
			if (selectedPanelType !== PANEL_TYPES.LIST) {
				return {
					...prev,
					graphType: getGraphType(selectedPanelType),
					formatForWeb: selectedPanelType === PANEL_TYPES.TABLE,
					originalGraphType: selectedPanelType,
				};
			}
			// For LIST panels, ensure proper configuration
			return {
				...prev,
				graphType: PANEL_TYPES.LIST,
				formatForWeb: false,
				originalGraphType: selectedPanelType,
			};
		});
	}, [selectedPanelType]);

	const response = useGetQueryRange(requestData, ENTITY_VERSION_V5, {
		queryKey: [
			widget?.query,
			selectedPanelType,
			requestData,
			version,
			minTime,
			maxTime,
		],
		enabled: !isDependedDataLoaded,
		keepPreviousData: true,
	});

	const onDragSelect = useCallback((start: number, end: number): void => {
		const startTimestamp = Math.trunc(start);
		const endTimestamp = Math.trunc(end);

		const { maxTime, minTime } = GetMinMax('custom', [
			startTimestamp,
			endTimestamp,
		]);

		setRequestData((prev) => ({
			...prev,
			start: Math.floor(minTime / 1e9),
			end: Math.floor(maxTime / 1e9),
		}));
	}, []);

	const [graphsVisibilityStates, setGraphsVisibilityStates] = useState<
		boolean[]
	>(Array(response.data?.payload?.data?.result?.length).fill(true));

	useEffect(() => {
		const {
			graphVisibilityStates: localStoredVisibilityState,
		} = getLocalStorageGraphVisibilityState({
			apiResponse: response.data?.payload.data.result || [],
			name: originalName,
		});
		setGraphsVisibilityStates(localStoredVisibilityState);
	}, [originalName, response.data?.payload.data.result]);

	const canModifyChart = useChartMutable({
		panelType: selectedPanelType,
		panelTypeAndGraphManagerVisibility: PANEL_TYPES_VS_FULL_VIEW_TABLE,
	});

	if (response.data && selectedPanelType === PANEL_TYPES.BAR) {
		const sortedSeriesData = getSortedSeriesData(
			response.data?.payload.data.result,
		);
		response.data.payload.data.result = sortedSeriesData;
	}

	if (response.data && selectedPanelType === PANEL_TYPES.PIE) {
		const transformedData = populateMultipleResults(response?.data);
		// eslint-disable-next-line no-param-reassign
		response.data = transformedData;
	}

	useEffect(() => {
		graphsVisibilityStates?.forEach((e, i) => {
			fullViewChartRef?.current?.toggleGraph(i, e);
		});
	}, [graphsVisibilityStates]);

	const isListView = selectedPanelType === PANEL_TYPES.LIST;

	const isTablePanel = selectedPanelType === PANEL_TYPES.TABLE;

	const [searchTerm, setSearchTerm] = useState<string>('');

	if (response.isLoading && selectedPanelType !== PANEL_TYPES.LIST) {
		return <Spinner height="100%" size="large" tip="Loading..." />;
	}

	return (
		<div className="full-view-container">
			<OverlayScrollbar>
				<>
					<div className="full-view-header-container">
						{fullViewOptions && (
							<TimeContainer $panelType={selectedPanelType}>
								{enableDrillDown && (
									<div className="drildown-options-container">
										{showResetQuery && (
											<Button type="link" onClick={handleResetQuery}>
												Reset Query
											</Button>
										)}
										{editWidget && (
											<Button
												className="switch-edit-btn"
												disabled={response.isFetching || response.isLoading}
												onClick={(): void => {
													if (dashboardEditView) {
														safeNavigate(dashboardEditView);
													}
												}}
											>
												Switch to Edit Mode
											</Button>
										)}
										<PanelTypeSelector
											selectedPanelType={selectedPanelType}
											disabled={response.isFetching || response.isLoading}
											query={drilldownQuery}
											widgetId={widget?.id || ''}
										/>
									</div>
								)}
								{!isEmpty(response.data?.warning) && (
									<WarningPopover warningData={response.data?.warning as Warning} />
								)}
								<div className="time-container">
									{response.isFetching && (
										<Spin spinning indicator={<LoadingOutlined spin />} />
									)}
									<TimePreference
										selectedTime={selectedTime}
										setSelectedTime={setSelectedTime}
									/>
									<Button
										style={{
											marginLeft: '4px',
										}}
										onClick={(): void => {
											response.refetch();
										}}
										type="primary"
										icon={<SyncOutlined />}
									/>
								</div>
							</TimeContainer>
						)}
						{enableDrillDown && (
							<>
								<QueryBuilderV2
									panelType={selectedPanelType}
									version={selectedDashboard?.data?.version || 'v3'}
									isListViewPanel={selectedPanelType === PANEL_TYPES.LIST}
									signalSourceChangeEnabled
									// filterConfigs={filterConfigs}
									// queryComponents={queryComponents}
								/>
								<RightToolbarActions
									onStageRunQuery={(): void => {
										handleRunQuery();
									}}
								/>
							</>
						)}
					</div>

					<div
						className={cx('graph-container', {
							disabled: isDashboardLocked,
							'height-widget':
								widget?.mergeAllActiveQueries || widget?.stackedBarChart,
							'full-view-graph-container': isListView,
						})}
						ref={fullViewRef}
					>
						<GraphContainer
							style={{
								height: isListView ? '100%' : '90%',
							}}
							isGraphLegendToggleAvailable={canModifyChart}
						>
							{isTablePanel && (
								<Input
									addonBefore={<SearchOutlined size={14} />}
									className="global-search"
									placeholder="Search..."
									allowClear
									key={widget.id}
									onChange={(e): void => {
										setSearchTerm(e.target.value || '');
									}}
								/>
							)}
							<PanelWrapper
								queryResponse={response}
								widget={widget}
								setRequestData={setRequestData}
								isFullViewMode
								onToggleModelHandler={onToggleModelHandler}
								setGraphVisibility={setGraphsVisibilityStates}
								graphVisibility={graphsVisibilityStates}
								onDragSelect={customOnDragSelect ?? onDragSelect}
								tableProcessedDataRef={tableProcessedDataRef}
								searchTerm={searchTerm}
								onClickHandler={onClickHandler}
								enableDrillDown={enableDrillDown}
								selectedGraph={selectedPanelType}
							/>
						</GraphContainer>
					</div>
				</>
			</OverlayScrollbar>
		</div>
	);
}

FullView.defaultProps = {
	fullViewOptions: undefined,
	onClickHandler: undefined,
	yAxisUnit: undefined,
	onDragSelect: undefined,
	isDependedDataLoaded: undefined,
};

FullView.displayName = 'FullView';

export default FullView;
