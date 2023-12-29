/* eslint-disable sonarjs/cognitive-complexity */
import { LockFilled, WarningOutlined } from '@ant-design/icons';
import { Button, Modal, Space, Tooltip, Typography } from 'antd';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { FeatureKeys } from 'constants/features';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { useUpdateDashboard } from 'hooks/dashboard/useUpdateDashboard';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { MESSAGE, useIsFeatureDisabled } from 'hooks/useFeatureFlag';
import { useNotifications } from 'hooks/useNotifications';
import useUrlQuery from 'hooks/useUrlQuery';
import history from 'lib/history';
import { DashboardWidgetPageParams } from 'pages/DashboardWidget';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import {
	getNextWidgets,
	getPreviousWidgets,
	getSelectedWidgetIndex,
} from 'providers/Dashboard/util';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { generatePath, useLocation, useParams } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { Dashboard, Widgets } from 'types/api/dashboard/getAll';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';
import AppReducer from 'types/reducer/app';

import LeftContainer from './LeftContainer';
import QueryTypeTag from './LeftContainer/QueryTypeTag';
import RightContainer from './RightContainer';
import { ThresholdProps } from './RightContainer/Threshold/types';
import TimeItems, { timePreferance } from './RightContainer/timeItems';
import {
	ButtonContainer,
	Container,
	LeftContainerWrapper,
	PanelContainer,
	RightContainerWrapper,
} from './styles';
import { NewWidgetProps } from './types';
import { getIsQueryModified } from './utils';

function NewWidget({ selectedGraph }: NewWidgetProps): JSX.Element {
	const {
		selectedDashboard,
		setSelectedDashboard,
		setToScrollWidgetId,
	} = useDashboard();

	const { t } = useTranslation(['dashboard']);

	const { currentQuery, stagedQuery } = useQueryBuilder();

	const isQueryModified = useMemo(
		() => getIsQueryModified(currentQuery, stagedQuery),
		[currentQuery, stagedQuery],
	);

	const { featureResponse } = useSelector<AppState, AppReducer>(
		(state) => state.app,
	);

	const { widgets = [] } = selectedDashboard?.data || {};

	const { search } = useLocation();

	const query = useUrlQuery();

	const { dashboardId } = useParams<DashboardWidgetPageParams>();

	const getWidget = useCallback(() => {
		const widgetId = query.get('widgetId');
		return widgets?.find((e) => e.id === widgetId);
	}, [query, widgets]);

	const selectedWidget = getWidget();

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

	const { notifications } = useNotifications();

	const onClickSaveHandler = useCallback(() => {
		if (!selectedDashboard) {
			return;
		}

		const dashboard: Dashboard = {
			...selectedDashboard,
			uuid: selectedDashboard.uuid,
			data: {
				...selectedDashboard.data,
				widgets: [
					...preWidgets,
					{
						...(selectedWidget || ({} as Widgets)),
						description,
						timePreferance: selectedTime.enum,
						isStacked: stacked,
						opacity,
						nullZeroValues: selectedNullZeroValue,
						title,
						yAxisUnit,
						panelTypes: graphType,
						thresholds,
						fillSpans: isFillSpans,
					},
					...afterWidgets,
				],
			},
		};

		updateDashboardMutation.mutateAsync(dashboard, {
			onSuccess: () => {
				setSelectedDashboard(dashboard);
				setToScrollWidgetId(selectedWidget?.id || '');
				featureResponse.refetch();
				history.push({
					pathname: generatePath(ROUTES.DASHBOARD, { dashboardId }),
				});
			},
			onError: () => {
				notifications.error({
					message: SOMETHING_WENT_WRONG,
				});
			},
		});
	}, [
		selectedDashboard,
		preWidgets,
		selectedWidget,
		description,
		selectedTime.enum,
		stacked,
		opacity,
		selectedNullZeroValue,
		title,
		yAxisUnit,
		graphType,
		thresholds,
		isFillSpans,
		afterWidgets,
		updateDashboardMutation,
		setSelectedDashboard,
		setToScrollWidgetId,
		featureResponse,
		dashboardId,
		notifications,
	]);

	const onClickDiscardHandler = useCallback(() => {
		if (isQueryModified) {
			setDiscardModal(true);
			return;
		}
		history.push(generatePath(ROUTES.DASHBOARD, { dashboardId }));
	}, [dashboardId, isQueryModified]);

	const discardChanges = useCallback(() => {
		history.push(generatePath(ROUTES.DASHBOARD, { dashboardId }));
	}, [dashboardId]);

	const setGraphHandler = (type: PANEL_TYPES): void => {
		const params = new URLSearchParams(search);
		params.set('graphType', type);
		setGraphType(type);
	};

	const onSaveDashboard = useCallback((): void => {
		setSaveModal(true);
	}, []);

	const isQueryBuilderActive = useIsFeatureDisabled(
		FeatureKeys.QUERY_BUILDER_PANELS,
	);

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

	return (
		<Container>
			<ButtonContainer>
				{isSaveDisabled && (
					<Tooltip title={MESSAGE.PANEL}>
						<Button
							icon={<LockFilled />}
							type="primary"
							disabled={isSaveDisabled}
							onClick={onSaveDashboard}
						>
							Save
						</Button>
					</Tooltip>
				)}

				{!isSaveDisabled && (
					<Button
						type="primary"
						data-testid="new-widget-save"
						disabled={isSaveDisabled}
						onClick={onSaveDashboard}
					>
						Save
					</Button>
				)}
				<Button onClick={onClickDiscardHandler}>Discard</Button>
			</ButtonContainer>

			<PanelContainer>
				<LeftContainerWrapper flex={5}>
					<LeftContainer
						selectedTime={selectedTime}
						selectedGraph={graphType}
						yAxisUnit={yAxisUnit}
						thresholds={thresholds}
						fillSpans={isFillSpans}
					/>
				</LeftContainerWrapper>

				<RightContainerWrapper flex={1}>
					<RightContainer
						setGraphHandler={setGraphHandler}
						title={title}
						setTitle={setTitle}
						description={description}
						setDescription={setDescription}
						stacked={stacked}
						setStacked={setStacked}
						opacity={opacity}
						yAxisUnit={yAxisUnit}
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
					/>
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
				centered
				open={saveModal}
				width={600}
			>
				{!isQueryModified ? (
					<Typography>
						{t('your_graph_build_with')}{' '}
						<QueryTypeTag queryType={currentQuery.queryType} />
						{t('dashboar_ok_confirm')}
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
