import { LockFilled } from '@ant-design/icons';
import { Button, Modal, Tooltip, Typography } from 'antd';
import { FeatureKeys } from 'constants/features';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { MESSAGE, useIsFeatureDisabled } from 'hooks/useFeatureFlag';
import { useNotifications } from 'hooks/useNotifications';
import history from 'lib/history';
import { DashboardWidgetPageParams } from 'pages/DashboardWidget';
import { useCallback, useMemo, useState } from 'react';
import { connect, useDispatch, useSelector } from 'react-redux';
import { generatePath, useLocation, useParams } from 'react-router-dom';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import {
	SaveDashboard,
	SaveDashboardProps,
} from 'store/actions/dashboard/saveDashboard';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { FLUSH_DASHBOARD } from 'types/actions/dashboard';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';
import AppReducer from 'types/reducer/app';
import DashboardReducer from 'types/reducer/dashboards';

import LeftContainer from './LeftContainer';
import QueryTypeTag from './LeftContainer/QueryTypeTag';
import RightContainer from './RightContainer';
import TimeItems, { timePreferance } from './RightContainer/timeItems';
import {
	ButtonContainer,
	Container,
	LeftContainerWrapper,
	PanelContainer,
	RightContainerWrapper,
} from './styles';
import { NewWidgetProps } from './types';

function NewWidget({ selectedGraph, saveSettingOfPanel }: Props): JSX.Element {
	const dispatch = useDispatch();
	const { dashboards } = useSelector<AppState, DashboardReducer>(
		(state) => state.dashboards,
	);

	const { currentQuery } = useQueryBuilder();

	const { featureResponse } = useSelector<AppState, AppReducer>(
		(state) => state.app,
	);

	const [selectedDashboard] = dashboards;

	const { widgets } = selectedDashboard.data;

	const { search } = useLocation();

	const query = useMemo(() => new URLSearchParams(search), [search]);

	const { dashboardId } = useParams<DashboardWidgetPageParams>();

	const getWidget = useCallback(() => {
		const widgetId = query.get('widgetId');
		return widgets?.find((e) => e.id === widgetId);
	}, [query, widgets]);

	const selectedWidget = getWidget();

	const [title, setTitle] = useState<string>(selectedWidget?.title || '');
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
	const [selectedNullZeroValue, setSelectedNullZeroValue] = useState<string>(
		selectedWidget?.nullZeroValues || 'zero',
	);
	const [saveModal, setSaveModal] = useState(false);

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

	const { notifications } = useNotifications();

	const onClickSaveHandler = useCallback(() => {
		// update the global state
		featureResponse
			.refetch()
			.then(() => {
				saveSettingOfPanel({
					uuid: selectedDashboard.uuid,
					description,
					isStacked: stacked,
					nullZeroValues: selectedNullZeroValue,
					opacity,
					timePreferance: selectedTime.enum,
					title,
					yAxisUnit,
					widgetId: query.get('widgetId') || '',
					dashboardId,
					graphType,
				});
			})
			.catch(() => {
				notifications.error({
					message: 'Something went wrong',
				});
			});
	}, [
		featureResponse,
		saveSettingOfPanel,
		selectedDashboard.uuid,
		description,
		stacked,
		selectedNullZeroValue,
		opacity,
		selectedTime.enum,
		title,
		yAxisUnit,
		query,
		dashboardId,
		graphType,
		notifications,
	]);

	const onClickDiscardHandler = useCallback(() => {
		dispatch({
			type: FLUSH_DASHBOARD,
		});
		history.push(generatePath(ROUTES.DASHBOARD, { dashboardId }));
	}, [dashboardId, dispatch]);

	const setGraphHandler = (type: PANEL_TYPES): void => {
		const params = new URLSearchParams(search);
		params.set('graphType', type);
		history.push({ search: params.toString() });
		setGraphType(type);
	};

	const onSaveDashboard = useCallback((): void => {
		setSaveModal(true);
	}, []);

	const isQueryBuilderActive = useIsFeatureDisabled(
		FeatureKeys.QUERY_BUILDER_PANELS,
	);

	const isNewTraceLogsAvailable = useMemo(
		() =>
			isQueryBuilderActive &&
			currentQuery.queryType === EQueryType.QUERY_BUILDER &&
			currentQuery.builder.queryData.find(
				(query) => query.dataSource !== DataSource.METRICS,
			) !== undefined,
		[
			currentQuery.builder.queryData,
			currentQuery.queryType,
			isQueryBuilderActive,
		],
	);

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
					<Button type="primary" disabled={isSaveDisabled} onClick={onSaveDashboard}>
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
					/>
				</LeftContainerWrapper>

				<RightContainerWrapper flex={1}>
					<RightContainer
						setGraphHandler={setGraphHandler}
						{...{
							title,
							setTitle,
							description,
							setDescription,
							stacked,
							setStacked,
							opacity,
							yAxisUnit,
							setOpacity,
							selectedNullZeroValue,
							setSelectedNullZeroValue,
							selectedGraph: graphType,
							setSelectedTime,
							selectedTime,
							setYAxisUnit,
						}}
					/>
				</RightContainerWrapper>
			</PanelContainer>
			<Modal
				title="Save Changes"
				focusTriggerAfterClose
				forceRender
				destroyOnClose
				closable
				onCancel={(): void => setSaveModal(false)}
				onOk={onClickSaveHandler}
				centered
				open={saveModal}
				width={600}
			>
				<Typography>
					Your graph built with <QueryTypeTag queryType={currentQuery.queryType} />{' '}
					query will be saved. Press OK to confirm.
				</Typography>
			</Modal>
		</Container>
	);
}

interface DispatchProps {
	saveSettingOfPanel: (
		props: SaveDashboardProps,
	) => (dispatch: Dispatch<AppActions>) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	saveSettingOfPanel: bindActionCreators(SaveDashboard, dispatch),
});

type Props = DispatchProps & NewWidgetProps;

export default connect(null, mapDispatchToProps)(NewWidget);
