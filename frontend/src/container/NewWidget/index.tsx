import { Button, Modal, Typography } from 'antd';
import ROUTES from 'constants/routes';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import { ITEMS } from 'container/NewDashboard/ComponentsSlider/menuItems';
import { getDashboardVariables } from 'lib/dashbaordVariables/getDashboardVariables';
import history from 'lib/history';
import { DashboardWidgetPageParams } from 'pages/DashboardWidget';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { connect, useDispatch, useSelector } from 'react-redux';
import { generatePath, useLocation, useParams } from 'react-router-dom';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import {
	GetQueryResults,
	GetQueryResultsProps,
} from 'store/actions/dashboard/getQueryResults';
import {
	SaveDashboard,
	SaveDashboardProps,
} from 'store/actions/dashboard/saveDashboard';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { FLUSH_DASHBOARD } from 'types/actions/dashboard';
import { Widgets } from 'types/api/dashboard/getAll';
import DashboardReducer from 'types/reducer/dashboards';
import { GlobalReducer } from 'types/reducer/globalTime';

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
	Tag,
} from './styles';

function NewWidget({
	selectedGraph,
	saveSettingOfPanel,
	getQueryResults,
}: Props): JSX.Element {
	const dispatch = useDispatch();
	const { dashboards } = useSelector<AppState, DashboardReducer>(
		(state) => state.dashboards,
	);
	const { selectedTime: globalSelectedInterval } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

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
	const [hasUnstagedChanges, setHasUnstagedChanges] = useState(false);

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

	const onClickSaveHandler = useCallback(() => {
		// update the global state
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
	}, [
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
	]);

	const onClickDiscardHandler = useCallback(() => {
		dispatch({
			type: FLUSH_DASHBOARD,
		});
		history.push(generatePath(ROUTES.DASHBOARD, { dashboardId }));
	}, [dashboardId, dispatch]);

	const getQueryResult = useCallback(() => {
		if (selectedWidget?.id.length !== 0 && selectedWidget?.query) {
			getQueryResults({
				query: selectedWidget?.query,
				selectedTime: selectedTime.enum,
				widgetId: selectedWidget?.id || '',
				graphType,
				globalSelectedInterval,
				variables: getDashboardVariables(),
			});
		}
	}, [
		selectedWidget?.query,
		selectedTime.enum,
		selectedWidget?.id,
		getQueryResults,
		globalSelectedInterval,
		graphType,
	]);

	const setGraphHandler = (type: ITEMS): void => {
		const params = new URLSearchParams(search);
		params.set('graphType', type);
		history.push({ search: params.toString() });
		setGraphType(type);
	};

	useEffect(() => {
		getQueryResult();
	}, [getQueryResult]);

	return (
		<Container>
			<ButtonContainer>
				<Button type="primary" onClick={(): void => setSaveModal(true)}>
					Save
				</Button>
				{/* <Button onClick={onClickApplyHandler}>Apply</Button> */}
				<Button onClick={onClickDiscardHandler}>Discard</Button>
			</ButtonContainer>

			<PanelContainer>
				<LeftContainerWrapper flex={5}>
					<LeftContainer
						handleUnstagedChanges={setHasUnstagedChanges}
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
				onOk={(): void => {
					onClickSaveHandler();
				}}
				centered
				open={saveModal}
				width={600}
			>
				{hasUnstagedChanges ? (
					<Typography>
						Looks like you have unstaged changes. Would you like to SAVE the last
						staged changes? If you want to stage new changes - Press{' '}
						<Tag>Stage & Run Query</Tag> and then try saving again.
					</Typography>
				) : (
					<Typography>
						Your graph built with{' '}
						<QueryTypeTag queryType={selectedWidget?.query.queryType} /> query will be
						saved. Press OK to confirm.
					</Typography>
				)}
			</Modal>
		</Container>
	);
}

export interface NewWidgetProps {
	selectedGraph: GRAPH_TYPES;
	yAxisUnit: Widgets['yAxisUnit'];
}

interface DispatchProps {
	saveSettingOfPanel: (
		props: SaveDashboardProps,
	) => (dispatch: Dispatch<AppActions>) => void;
	getQueryResults: (
		props: GetQueryResultsProps,
	) => (dispatch: Dispatch<AppActions>) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	saveSettingOfPanel: bindActionCreators(SaveDashboard, dispatch),
	getQueryResults: bindActionCreators(GetQueryResults, dispatch),
});

type Props = DispatchProps & NewWidgetProps;

export default connect(null, mapDispatchToProps)(NewWidget);
