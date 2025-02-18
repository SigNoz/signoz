import './WidgetFullView.styles.scss';

import {
	LoadingOutlined,
	SearchOutlined,
	SyncOutlined,
} from '@ant-design/icons';
import { Button, Input, Spin } from 'antd';
import cx from 'classnames';
import { ToggleGraphProps } from 'components/Graph/types';
import Spinner from 'components/Spinner';
import TimePreference from 'components/TimePreferenceDropDown';
import { DEFAULT_ENTITY_VERSION } from 'constants/app';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import {
	timeItems,
	timePreferance,
} from 'container/NewWidget/RightContainer/timeItems';
import PanelWrapper from 'container/PanelWrapper/PanelWrapper';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import { useChartMutable } from 'hooks/useChartMutable';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import { getDashboardVariables } from 'lib/dashbaordVariables/getDashboardVariables';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import GetMinMax from 'lib/getMinMax';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { UpdateTimeInterval } from 'store/actions';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';
import { getGraphType } from 'utils/getGraphType';
import { getSortedSeriesData } from 'utils/getSortedSeriesData';

import { getLocalStorageGraphVisibilityState } from '../utils';
import { PANEL_TYPES_VS_FULL_VIEW_TABLE } from './contants';
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
}: FullViewProps): JSX.Element {
	const { safeNavigate } = useSafeNavigate();
	const { selectedTime: globalSelectedTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);
	const dispatch = useDispatch();
	const urlQuery = useUrlQuery();
	const location = useLocation();

	const fullViewRef = useRef<HTMLDivElement>(null);

	const { selectedDashboard, isDashboardLocked } = useDashboard();

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

	const [requestData, setRequestData] = useState<GetQueryResultsProps>(() => {
		if (widget.panelTypes !== PANEL_TYPES.LIST) {
			return {
				selectedTime: selectedTime.enum,
				graphType: getGraphType(widget.panelTypes),
				query: updatedQuery,
				globalSelectedInterval: globalSelectedTime,
				variables: getDashboardVariables(selectedDashboard?.data.variables),
				fillGaps: widget.fillSpans,
				formatForWeb: widget.panelTypes === PANEL_TYPES.TABLE,
			};
		}
		updatedQuery.builder.queryData[0].pageSize = 10;
		return {
			query: updatedQuery,
			graphType: PANEL_TYPES.LIST,
			selectedTime: widget?.timePreferance || 'GLOBAL_TIME',
			globalSelectedInterval: globalSelectedTime,
			tableParams: {
				pagination: {
					offset: 0,
					limit: updatedQuery.builder.queryData[0].limit || 0,
				},
			},
		};
	});

	useEffect(() => {
		setRequestData((prev) => ({
			...prev,
			selectedTime: selectedTime.enum,
		}));
	}, [selectedTime]);

	const response = useGetQueryRange(
		requestData,
		selectedDashboard?.data?.version || version || DEFAULT_ENTITY_VERSION,
		{
			queryKey: [widget?.query, widget?.panelTypes, requestData, version],
			enabled: !isDependedDataLoaded,
			keepPreviousData: true,
		},
	);

	const onDragSelect = useCallback(
		(start: number, end: number): void => {
			const startTimestamp = Math.trunc(start);
			const endTimestamp = Math.trunc(end);

			if (startTimestamp !== endTimestamp) {
				dispatch(UpdateTimeInterval('custom', [startTimestamp, endTimestamp]));
			}

			const { maxTime, minTime } = GetMinMax('custom', [
				startTimestamp,
				endTimestamp,
			]);

			urlQuery.set(QueryParams.startTime, minTime.toString());
			urlQuery.set(QueryParams.endTime, maxTime.toString());
			const generatedUrl = `${location.pathname}?${urlQuery.toString()}`;
			safeNavigate(generatedUrl);
		},
		[dispatch, location.pathname, safeNavigate, urlQuery],
	);

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
		panelType: widget.panelTypes,
		panelTypeAndGraphManagerVisibility: PANEL_TYPES_VS_FULL_VIEW_TABLE,
	});

	if (response.data && widget.panelTypes === PANEL_TYPES.BAR) {
		const sortedSeriesData = getSortedSeriesData(
			response.data?.payload.data.result,
		);
		response.data.payload.data.result = sortedSeriesData;
	}

	useEffect(() => {
		graphsVisibilityStates?.forEach((e, i) => {
			fullViewChartRef?.current?.toggleGraph(i, e);
		});
	}, [graphsVisibilityStates]);

	const isListView = widget.panelTypes === PANEL_TYPES.LIST;

	const isTablePanel = widget.panelTypes === PANEL_TYPES.TABLE;

	const [searchTerm, setSearchTerm] = useState<string>('');

	if (response.isLoading && widget.panelTypes !== PANEL_TYPES.LIST) {
		return <Spinner height="100%" size="large" tip="Loading..." />;
	}

	return (
		<div className="full-view-container">
			<div className="full-view-header-container">
				{fullViewOptions && (
					<TimeContainer $panelType={widget.panelTypes}>
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
					</TimeContainer>
				)}
			</div>

			<div
				className={cx('graph-container', {
					disabled: isDashboardLocked,
					'height-widget': widget?.mergeAllActiveQueries || widget?.stackedBarChart,
					'list-graph-container': isListView,
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
						onDragSelect={onDragSelect}
						tableProcessedDataRef={tableProcessedDataRef}
						searchTerm={searchTerm}
					/>
				</GraphContainer>
			</div>
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
