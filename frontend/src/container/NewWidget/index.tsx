/* eslint-disable sonarjs/cognitive-complexity */
import './NewWidget.styles.scss';

import { WarningOutlined } from '@ant-design/icons';
import { Button, Flex, Modal, Space, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { FeatureKeys } from 'constants/features';
import { QueryParams } from 'constants/query';
import {
	initialQueriesMap,
	PANEL_GROUP_TYPES,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { DashboardShortcuts } from 'constants/shortcuts/DashboardShortcuts';
import { DEFAULT_BUCKET_COUNT } from 'container/PanelWrapper/constants';
import { useUpdateDashboard } from 'hooks/dashboard/useUpdateDashboard';
import { useKeyboardHotkeys } from 'hooks/hotkeys/useKeyboardHotkeys';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import useAxiosError from 'hooks/useAxiosError';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import { getDashboardVariables } from 'lib/dashbaordVariables/getDashboardVariables';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import { defaultTo, isEmpty, isUndefined } from 'lodash-es';
import { Check, X } from 'lucide-react';
import { DashboardWidgetPageParams } from 'pages/DashboardWidget';
import { useAppContext } from 'providers/App/App';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import {
	getNextWidgets,
	getPreviousWidgets,
	getSelectedWidgetIndex,
} from 'providers/Dashboard/util';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { generatePath, useParams } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { ColumnUnit, Dashboard, Widgets } from 'types/api/dashboard/getAll';
import { IField } from 'types/api/logs/fields';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';
import { getGraphType, getGraphTypeForFormat } from 'utils/getGraphType';

import LeftContainer from './LeftContainer';
import QueryTypeTag from './LeftContainer/QueryTypeTag';
import RightContainer from './RightContainer';
import { ThresholdProps } from './RightContainer/Threshold/types';
import TimeItems, { timePreferance } from './RightContainer/timeItems';
import {
	Container,
	LeftContainerWrapper,
	PanelContainer,
	RightContainerWrapper,
} from './styles';
import { NewWidgetProps } from './types';
import {
	getDefaultWidgetData,
	getIsQueryModified,
	handleQueryChange,
	placeWidgetAtBottom,
	placeWidgetBetweenRows,
} from './utils';

function NewWidget({ selectedGraph }: NewWidgetProps): JSX.Element {
	const { safeNavigate } = useSafeNavigate();
	const {
		selectedDashboard,
		setSelectedDashboard,
		setToScrollWidgetId,
		selectedRowWidgetId,
		setSelectedRowWidgetId,
	} = useDashboard();

	const { t } = useTranslation(['dashboard']);

	const { featureFlags } = useAppContext();

	const { registerShortcut, deregisterShortcut } = useKeyboardHotkeys();

	const {
		currentQuery,
		stagedQuery,
		redirectWithQueryBuilderData,
		supersetQuery,
		setSupersetQuery,
	} = useQueryBuilder();

	const isQueryModified = useMemo(
		() => getIsQueryModified(currentQuery, stagedQuery),
		[currentQuery, stagedQuery],
	);

	const { selectedTime: globalSelectedInterval } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const { widgets = [] } = selectedDashboard?.data || {};

	const query = useUrlQuery();

	const { dashboardId } = useParams<DashboardWidgetPageParams>();

	const [isNewDashboard, setIsNewDashboard] = useState<boolean>(false);

	const logEventCalledRef = useRef(false);

	useEffect(() => {
		const widgetId = query.get('widgetId');
		const selectedWidget = widgets?.find((e) => e.id === widgetId);
		const isWidgetNotPresent = isUndefined(selectedWidget);
		if (isWidgetNotPresent) {
			setIsNewDashboard(true);
		}

		if (!logEventCalledRef.current) {
			logEvent('Panel Edit: Page visited', {
				panelType: selectedWidget?.panelTypes,
				dashboardId: selectedDashboard?.uuid,
				widgetId: selectedWidget?.id,
				dashboardName: selectedDashboard?.data.title,
				isNewPanel: !!isWidgetNotPresent,
				dataSource: currentQuery.builder.queryData?.[0]?.dataSource,
			});
			logEventCalledRef.current = true;
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const getWidget = useCallback(() => {
		const widgetId = query.get('widgetId');
		const selectedWidget = widgets?.find((e) => e.id === widgetId);
		return defaultTo(
			selectedWidget,
			getDefaultWidgetData(widgetId || '', selectedGraph),
		) as Widgets;
	}, [query, selectedGraph, widgets]);

	const [selectedWidget, setSelectedWidget] = useState(getWidget());

	const [title, setTitle] = useState<string>(
		selectedWidget?.title?.toString() || '',
	);
	const [description, setDescription] = useState<string>(
		selectedWidget?.description || '',
	);
	const [yAxisUnit, setYAxisUnit] = useState<string>(
		selectedWidget?.yAxisUnit || 'none',
	);

	const [stacked, setStacked] = useState<boolean>(
		selectedWidget?.isStacked || false,
	);

	const [stackedBarChart, setStackedBarChart] = useState<boolean>(
		selectedWidget?.stackedBarChart || false,
	);
	const [opacity, setOpacity] = useState<string>(selectedWidget?.opacity || '1');
	const [thresholds, setThresholds] = useState<ThresholdProps[]>(
		selectedWidget?.thresholds || [],
	);
	const [selectedNullZeroValue, setSelectedNullZeroValue] = useState<string>(
		selectedWidget?.nullZeroValues || 'zero',
	);
	const [isFillSpans, setIsFillSpans] = useState<boolean>(
		selectedWidget?.fillSpans || false,
	);
	const [saveModal, setSaveModal] = useState(false);
	const [discardModal, setDiscardModal] = useState(false);

	const [bucketWidth, setBucketWidth] = useState<number>(
		selectedWidget?.bucketWidth || 0,
	);

	const [bucketCount, setBucketCount] = useState<number>(
		selectedWidget?.bucketCount || DEFAULT_BUCKET_COUNT,
	);

	const [combineHistogram, setCombineHistogram] = useState<boolean>(
		selectedWidget?.mergeAllActiveQueries || false,
	);

	const [softMin, setSoftMin] = useState<number | null>(
		selectedWidget?.softMin === null || selectedWidget?.softMin === undefined
			? null
			: selectedWidget?.softMin || 0,
	);

	const [selectedLogFields, setSelectedLogFields] = useState<IField[] | null>(
		selectedWidget?.selectedLogFields || null,
	);

	const [selectedTracesFields, setSelectedTracesFields] = useState(
		selectedWidget?.selectedTracesFields || null,
	);

	const [softMax, setSoftMax] = useState<number | null>(
		selectedWidget?.softMax === null || selectedWidget?.softMax === undefined
			? null
			: selectedWidget?.softMax || 0,
	);

	const [columnUnits, setColumnUnits] = useState<ColumnUnit>(
		selectedWidget?.columnUnits || {},
	);

	useEffect(() => {
		setSelectedWidget((prev) => {
			if (!prev) {
				return prev;
			}
			return {
				...prev,
				query: currentQuery,
				title,
				description,
				isStacked: stacked,
				opacity,
				nullZeroValues: selectedNullZeroValue,
				yAxisUnit,
				thresholds,
				softMin,
				softMax,
				fillSpans: isFillSpans,
				columnUnits,
				bucketCount,
				stackedBarChart,
				bucketWidth,
				mergeAllActiveQueries: combineHistogram,
				selectedLogFields,
				selectedTracesFields,
			};
		});
	}, [
		columnUnits,
		currentQuery,
		description,
		isFillSpans,
		opacity,
		selectedLogFields,
		selectedNullZeroValue,
		selectedTracesFields,
		softMax,
		softMin,
		stacked,
		thresholds,
		title,
		yAxisUnit,
		bucketWidth,
		bucketCount,
		combineHistogram,
		stackedBarChart,
	]);

	const closeModal = (): void => {
		setSaveModal(false);
		setDiscardModal(false);
	};

	const [graphType, setGraphType] = useState(selectedGraph);

	const getSelectedTime = useCallback(
		() =>
			TimeItems.find(
				(e) => e.enum === (selectedWidget?.timePreferance || 'GLOBAL_TIME'),
			),
		[selectedWidget],
	);

	const [selectedTime, setSelectedTime] = useState<timePreferance>({
		name: getSelectedTime()?.name || '',
		enum: selectedWidget?.timePreferance || 'GLOBAL_TIME',
	});

	const updateDashboardMutation = useUpdateDashboard();

	const { afterWidgets, preWidgets } = useMemo(() => {
		if (!selectedDashboard) {
			return {
				selectedWidget: {} as Widgets,
				preWidgets: [],
				afterWidgets: [],
			};
		}

		const widgetId = query.get('widgetId');

		const selectedWidgetIndex = getSelectedWidgetIndex(
			selectedDashboard,
			widgetId,
		);

		const preWidgets = getPreviousWidgets(selectedDashboard, selectedWidgetIndex);

		const afterWidgets = getNextWidgets(selectedDashboard, selectedWidgetIndex);

		const selectedWidget = (selectedDashboard.data.widgets || [])[
			selectedWidgetIndex || 0
		];

		return { selectedWidget, preWidgets, afterWidgets };
	}, [selectedDashboard, query]);

	const handleError = useAxiosError();

	// this loading state is to take care of mismatch in the responses for table and other panels
	// hence while changing the query contains the older value and the processing logic fails
	const [isLoadingPanelData, setIsLoadingPanelData] = useState<boolean>(false);

	// request data should be handled by the parent and the child components should consume the same
	// this has been moved here from the left container
	const [requestData, setRequestData] = useState<GetQueryResultsProps>(() => {
		if (selectedWidget && selectedGraph !== PANEL_TYPES.LIST) {
			return {
				selectedTime: selectedWidget?.timePreferance,
				graphType: getGraphType(selectedGraph || selectedWidget.panelTypes),
				query: stagedQuery || initialQueriesMap.metrics,
				globalSelectedInterval,
				formatForWeb:
					getGraphTypeForFormat(selectedGraph || selectedWidget.panelTypes) ===
					PANEL_TYPES.TABLE,
				variables: getDashboardVariables(selectedDashboard?.data.variables),
			};
		}
		const updatedQuery = { ...(stagedQuery || initialQueriesMap.metrics) };
		updatedQuery.builder.queryData[0].pageSize = 10;

		// If stagedQuery exists, don't re-run the query (e.g. when clicking on Add to Dashboard from logs and traces explorer)
		if (!stagedQuery) {
			redirectWithQueryBuilderData(updatedQuery);
		}
		return {
			query: updatedQuery,
			graphType: PANEL_TYPES.LIST,
			selectedTime: selectedTime.enum || 'GLOBAL_TIME',
			globalSelectedInterval,
			tableParams: {
				pagination: {
					offset: 0,
					limit: updatedQuery.builder.queryData[0].limit || 0,
				},
			},
		};
	});

	useEffect(() => {
		if (stagedQuery) {
			setIsLoadingPanelData(false);
			setRequestData((prev) => ({
				...prev,
				selectedTime: selectedTime.enum || prev.selectedTime,
				globalSelectedInterval,
				graphType: getGraphType(selectedGraph || selectedWidget.panelTypes),
				query: stagedQuery,
				fillGaps: selectedWidget.fillSpans || false,
				formatForWeb:
					getGraphTypeForFormat(selectedGraph || selectedWidget.panelTypes) ===
					PANEL_TYPES.TABLE,
			}));
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		stagedQuery,
		selectedTime,
		selectedWidget.fillSpans,
		globalSelectedInterval,
	]);

	const onClickSaveHandler = useCallback(() => {
		if (!selectedDashboard) {
			return;
		}

		const widgetId = query.get('widgetId') || '';
		let updatedLayout = selectedDashboard.data.layout || [];

		if (isNewDashboard && isEmpty(selectedRowWidgetId)) {
			const newLayoutItem = placeWidgetAtBottom(widgetId, updatedLayout);
			updatedLayout = [...updatedLayout, newLayoutItem];
		}

		if (isNewDashboard && selectedRowWidgetId) {
			// Find the next row by looking through remaining layout items
			const currentIndex = updatedLayout.findIndex(
				(e) => e.i === selectedRowWidgetId,
			);
			const nextRowIndex = updatedLayout.findIndex(
				(item, index) =>
					index > currentIndex &&
					widgets?.find((w) => w.id === item.i)?.panelTypes ===
						PANEL_GROUP_TYPES.ROW,
			);
			const nextRowId = nextRowIndex !== -1 ? updatedLayout[nextRowIndex].i : null;

			const newLayoutItem = placeWidgetBetweenRows(
				widgetId,
				updatedLayout,
				selectedRowWidgetId,
				nextRowId,
			);
			updatedLayout = newLayoutItem;
		}

		const dashboard: Dashboard = {
			...selectedDashboard,
			uuid: selectedDashboard.uuid,
			data: {
				...selectedDashboard.data,
				widgets: isNewDashboard
					? [
							...afterWidgets,
							{
								...(selectedWidget || ({} as Widgets)),
								description: selectedWidget?.description || '',
								timePreferance: selectedTime.enum,
								isStacked: selectedWidget?.isStacked || false,
								opacity: selectedWidget?.opacity || '1',
								nullZeroValues: selectedWidget?.nullZeroValues || 'zero',
								title: selectedWidget?.title,
								stackedBarChart: selectedWidget?.stackedBarChart || false,
								yAxisUnit: selectedWidget?.yAxisUnit,
								panelTypes: graphType,
								query: currentQuery,
								thresholds: selectedWidget?.thresholds,
								columnUnits: selectedWidget?.columnUnits,
								softMin: selectedWidget?.softMin || 0,
								softMax: selectedWidget?.softMax || 0,
								fillSpans: selectedWidget?.fillSpans,
								bucketWidth: selectedWidget?.bucketWidth || 0,
								bucketCount: selectedWidget?.bucketCount || 0,
								mergeAllActiveQueries: selectedWidget?.mergeAllActiveQueries || false,
								selectedLogFields: selectedWidget?.selectedLogFields || [],
								selectedTracesFields: selectedWidget?.selectedTracesFields || [],
							},
					  ]
					: [
							...preWidgets,
							{
								...(selectedWidget || ({} as Widgets)),
								description: selectedWidget?.description || '',
								timePreferance: selectedTime.enum,
								isStacked: selectedWidget?.isStacked || false,
								opacity: selectedWidget?.opacity || '1',
								nullZeroValues: selectedWidget?.nullZeroValues || 'zero',
								title: selectedWidget?.title,
								stackedBarChart: selectedWidget?.stackedBarChart || false,
								yAxisUnit: selectedWidget?.yAxisUnit,
								panelTypes: graphType,
								query: currentQuery,
								thresholds: selectedWidget?.thresholds,
								columnUnits: selectedWidget?.columnUnits,
								softMin: selectedWidget?.softMin || 0,
								softMax: selectedWidget?.softMax || 0,
								fillSpans: selectedWidget?.fillSpans,
								bucketWidth: selectedWidget?.bucketWidth || 0,
								bucketCount: selectedWidget?.bucketCount || 0,
								mergeAllActiveQueries: selectedWidget?.mergeAllActiveQueries || false,
								selectedLogFields: selectedWidget?.selectedLogFields || [],
								selectedTracesFields: selectedWidget?.selectedTracesFields || [],
							},
							...afterWidgets,
					  ],
				layout: [...updatedLayout],
			},
		};

		updateDashboardMutation.mutateAsync(dashboard, {
			onSuccess: () => {
				setSelectedRowWidgetId(null);
				setSelectedDashboard(dashboard);
				setToScrollWidgetId(selectedWidget?.id || '');
				safeNavigate({
					pathname: generatePath(ROUTES.DASHBOARD, { dashboardId }),
				});
			},
			onError: handleError,
		});
	}, [
		selectedDashboard,
		query,
		isNewDashboard,
		selectedRowWidgetId,
		afterWidgets,
		selectedWidget,
		selectedTime.enum,
		graphType,
		currentQuery,
		preWidgets,
		updateDashboardMutation,
		handleError,
		widgets,
		setSelectedDashboard,
		setToScrollWidgetId,
		setSelectedRowWidgetId,
		safeNavigate,
		dashboardId,
	]);

	const onClickDiscardHandler = useCallback(() => {
		if (isQueryModified) {
			setDiscardModal(true);
			return;
		}
		safeNavigate(generatePath(ROUTES.DASHBOARD, { dashboardId }));
	}, [dashboardId, isQueryModified, safeNavigate]);

	const discardChanges = useCallback(() => {
		safeNavigate(generatePath(ROUTES.DASHBOARD, { dashboardId }));
	}, [dashboardId, safeNavigate]);

	const setGraphHandler = (type: PANEL_TYPES): void => {
		setIsLoadingPanelData(true);
		const updatedQuery = handleQueryChange(type as any, supersetQuery);
		setGraphType(type);
		redirectWithQueryBuilderData(
			updatedQuery,
			{ [QueryParams.graphType]: type },
			undefined,
			true,
		);
	};

	const onSaveDashboard = useCallback((): void => {
		const widgetId = query.get('widgetId');
		const selectWidget = widgets?.find((e) => e.id === widgetId);

		logEvent('Panel Edit: Save changes', {
			panelType: selectedWidget.panelTypes,
			dashboardId: selectedDashboard?.uuid,
			widgetId: selectedWidget.id,
			dashboardName: selectedDashboard?.data.title,
			queryType: currentQuery.queryType,
			isNewPanel: isUndefined(selectWidget),
			dataSource: currentQuery.builder.queryData?.[0]?.dataSource,
		});
		setSaveModal(true);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const isQueryBuilderActive =
		!featureFlags?.find((flag) => flag.name === FeatureKeys.QUERY_BUILDER_PANELS)
			?.active || false;

	const isNewTraceLogsAvailable =
		isQueryBuilderActive &&
		currentQuery.queryType === EQueryType.QUERY_BUILDER &&
		currentQuery.builder.queryData.find(
			(query) => query.dataSource !== DataSource.METRICS,
		) !== undefined;

	const isSaveDisabled = useMemo(() => {
		// new created dashboard
		if (selectedWidget?.id === 'empty') {
			return isNewTraceLogsAvailable;
		}

		const isTraceOrLogsQueryBuilder =
			currentQuery.builder.queryData.find(
				(query) =>
					query.dataSource === DataSource.TRACES ||
					query.dataSource === DataSource.LOGS,
			) !== undefined;

		if (isTraceOrLogsQueryBuilder) {
			return false;
		}

		return isNewTraceLogsAvailable;
	}, [
		currentQuery.builder.queryData,
		selectedWidget?.id,
		isNewTraceLogsAvailable,
	]);

	useEffect(() => {
		/**
		 * we need this extra handling for superset query because we cannot keep this in sync with current query
		 * always.we do not sync superset query in the initQueryBuilderData because that function is called on all stage and run
		 * actions. we do not want that as we loose out on superset functionalities if we do the same. hence initialising the superset query
		 * on mount here with the currentQuery in the begining itself
		 */
		setSupersetQuery(currentQuery);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		registerShortcut(DashboardShortcuts.SaveChanges, onSaveDashboard);
		registerShortcut(DashboardShortcuts.DiscardChanges, onClickDiscardHandler);

		return (): void => {
			deregisterShortcut(DashboardShortcuts.SaveChanges);
			deregisterShortcut(DashboardShortcuts.DiscardChanges);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [onSaveDashboard]);

	useEffect(() => {
		if (selectedGraph === PANEL_TYPES.LIST) {
			const initialDataSource = currentQuery.builder.queryData[0].dataSource;
			if (initialDataSource === DataSource.LOGS) {
				// we do not need selected log columns in the request data as the entire response contains all the necessary data
				setRequestData((prev) => ({
					...prev,
					tableParams: {
						...prev.tableParams,
					},
				}));
			} else if (initialDataSource === DataSource.TRACES) {
				setRequestData((prev) => ({
					...prev,
					tableParams: {
						...prev.tableParams,
						selectColumns: selectedTracesFields,
					},
				}));
			}
		}
	}, [selectedLogFields, selectedTracesFields, currentQuery, selectedGraph]);

	return (
		<Container>
			<div className="edit-header">
				<div className="left-header">
					<X
						size={14}
						onClick={onClickDiscardHandler}
						className="discard-icon"
						data-testid="discard-button"
					/>
					<Flex align="center" gap={24}>
						<Typography.Text className="configure-panel">
							Configure panel
						</Typography.Text>
					</Flex>
				</div>
				{isSaveDisabled && (
					<Button
						type="primary"
						data-testid="new-widget-save"
						loading={updateDashboardMutation.isLoading}
						disabled={isSaveDisabled}
						onClick={onSaveDashboard}
						className="save-btn"
					>
						Save Changes
					</Button>
				)}
				{!isSaveDisabled && (
					<Button
						type="primary"
						data-testid="new-widget-save"
						loading={updateDashboardMutation.isLoading}
						disabled={isSaveDisabled}
						onClick={onSaveDashboard}
						icon={<Check size={14} />}
						className="save-btn"
					>
						Save Changes
					</Button>
				)}
			</div>

			<PanelContainer>
				<LeftContainerWrapper isDarkMode={useIsDarkMode()}>
					<OverlayScrollbar>
						{selectedWidget && (
							<LeftContainer
								selectedGraph={graphType}
								selectedLogFields={selectedLogFields}
								setSelectedLogFields={setSelectedLogFields}
								selectedTracesFields={selectedTracesFields}
								setSelectedTracesFields={setSelectedTracesFields}
								selectedWidget={selectedWidget}
								selectedTime={selectedTime}
								requestData={requestData}
								setRequestData={setRequestData}
								isLoadingPanelData={isLoadingPanelData}
							/>
						)}
					</OverlayScrollbar>
				</LeftContainerWrapper>

				<RightContainerWrapper>
					<OverlayScrollbar>
						<RightContainer
							setGraphHandler={setGraphHandler}
							title={title}
							setTitle={setTitle}
							description={description}
							setDescription={setDescription}
							stacked={stacked}
							setStacked={setStacked}
							stackedBarChart={stackedBarChart}
							setStackedBarChart={setStackedBarChart}
							opacity={opacity}
							yAxisUnit={yAxisUnit}
							columnUnits={columnUnits}
							setColumnUnits={setColumnUnits}
							bucketCount={bucketCount}
							bucketWidth={bucketWidth}
							combineHistogram={combineHistogram}
							setCombineHistogram={setCombineHistogram}
							setBucketWidth={setBucketWidth}
							setBucketCount={setBucketCount}
							setOpacity={setOpacity}
							selectedNullZeroValue={selectedNullZeroValue}
							setSelectedNullZeroValue={setSelectedNullZeroValue}
							selectedGraph={graphType}
							setSelectedTime={setSelectedTime}
							selectedTime={selectedTime}
							setYAxisUnit={setYAxisUnit}
							thresholds={thresholds}
							setThresholds={setThresholds}
							selectedWidget={selectedWidget}
							isFillSpans={isFillSpans}
							setIsFillSpans={setIsFillSpans}
							softMin={softMin}
							setSoftMin={setSoftMin}
							softMax={softMax}
							setSoftMax={setSoftMax}
						/>
					</OverlayScrollbar>
				</RightContainerWrapper>
			</PanelContainer>
			<Modal
				title={
					isQueryModified ? (
						<Space>
							<WarningOutlined style={{ fontSize: '16px', color: '#fdd600' }} />
							Unsaved Changes
						</Space>
					) : (
						'Save Widget'
					)
				}
				focusTriggerAfterClose
				forceRender
				destroyOnClose
				closable
				onCancel={closeModal}
				onOk={onClickSaveHandler}
				confirmLoading={updateDashboardMutation.isLoading}
				centered
				open={saveModal}
				width={600}
			>
				{!isQueryModified ? (
					<Typography>
						{t('your_graph_build_with')}{' '}
						<QueryTypeTag queryType={currentQuery.queryType} />{' '}
						{t('dashboard_ok_confirm')}
					</Typography>
				) : (
					<Typography>{t('dashboard_unsave_changes')} </Typography>
				)}
			</Modal>
			<Modal
				title={
					<Space>
						<WarningOutlined style={{ fontSize: '16px', color: '#fdd600' }} />
						Unsaved Changes
					</Space>
				}
				focusTriggerAfterClose
				forceRender
				destroyOnClose
				closable
				onCancel={closeModal}
				onOk={discardChanges}
				centered
				open={discardModal}
				width={600}
			>
				<Typography>{t('dashboard_unsave_changes')}</Typography>
			</Modal>
		</Container>
	);
}

export default NewWidget;
