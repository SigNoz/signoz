import { Button } from 'antd';
import ROUTES from 'constants/routes';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import history from 'lib/history';
import { DashboardWidgetPageParams } from 'pages/DashboardWidget';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { generatePath, useLocation, useParams } from 'react-router-dom';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { ApplySettingsToPanel, ApplySettingsToPanelProps } from 'store/actions';
import {
	GetQueryResults,
	GetQueryResultsProps,
} from 'store/actions/dashboard/getQueryResults';
import {
	SaveDashboard,
	SaveDashboardProps,
} from 'store/actions/dashboard/saveDashboard';
import {
	UpdateQuery,
	UpdateQueryProps,
} from 'store/actions/dashboard/updateQuery';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { Widgets } from 'types/api/dashboard/getAll';
import DashboardReducer from 'types/reducer/dashboards';
import { GlobalReducer } from 'types/reducer/globalTime';

import LeftContainer from './LeftContainer';
import RightContainer from './RightContainer';
import TimeItems, { timePreferance } from './RightContainer/timeItems';
import {
	ButtonContainer,
	Container,
	LeftContainerWrapper,
	PanelContainer,
	RightContainerWrapper,
} from './styles';

function NewWidget({
	selectedGraph,
	applySettingsToPanel,
	saveSettingOfPanel,
	getQueryResults,
	updateQuery,
}: Props): JSX.Element {
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

	const query = useMemo(() => {
		return new URLSearchParams(search);
	}, [search]);

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
		});
	}, [
		opacity,
		description,
		query,
		selectedTime,
		stacked,
		title,
		selectedNullZeroValue,
		saveSettingOfPanel,
		selectedDashboard,
		dashboardId,
		yAxisUnit,
	]);

	const onClickApplyHandler = (): void => {
		selectedWidget?.query.forEach((element, index) => {
			updateQuery({
				widgetId: selectedWidget?.id || '',
				query: element.query || '',
				legend: element.legend || '',
				currentIndex: index,
				yAxisUnit,
			});
		});

		applySettingsToPanel({
			description,
			isStacked: stacked,
			nullZeroValues: selectedNullZeroValue,
			opacity,
			timePreferance: selectedTime.enum,
			title,
			widgetId: selectedWidget?.id || '',
			yAxisUnit,
		});
	};

	const onClickDiscardHandler = useCallback(() => {
		history.push(generatePath(ROUTES.DASHBOARD, { dashboardId }));
	}, [dashboardId]);

	const getQueryResult = useCallback(() => {
		if (selectedWidget?.id.length !== 0) {
			getQueryResults({
				query: selectedWidget?.query || [],
				selectedTime: selectedTime.enum,
				widgetId: selectedWidget?.id || '',
				graphType: selectedGraph,
				globalSelectedInterval,
			});
		}
	}, [
		selectedWidget?.query,
		selectedTime.enum,
		selectedWidget?.id,
		selectedGraph,
		getQueryResults,
		globalSelectedInterval,
	]);

	useEffect(() => {
		getQueryResult();
	}, [getQueryResult]);

	return (
		<Container>
			<ButtonContainer>
				<Button onClick={onClickSaveHandler}>Save</Button>
				<Button onClick={onClickApplyHandler}>Apply</Button>
				<Button onClick={onClickDiscardHandler}>Discard</Button>
			</ButtonContainer>

			<PanelContainer>
				<LeftContainerWrapper flex={5}>
					<LeftContainer
						selectedTime={selectedTime}
						selectedGraph={selectedGraph}
						yAxisUnit={yAxisUnit}
					/>
				</LeftContainerWrapper>

				<RightContainerWrapper flex={1}>
					<RightContainer
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
							selectedGraph,
							setSelectedTime,
							selectedTime,
							setYAxisUnit,
						}}
					/>
				</RightContainerWrapper>
			</PanelContainer>
		</Container>
	);
}

export interface NewWidgetProps {
	selectedGraph: GRAPH_TYPES;
	yAxisUnit: Widgets['yAxisUnit'];
}

interface DispatchProps {
	applySettingsToPanel: (
		props: ApplySettingsToPanelProps,
	) => (dispatch: Dispatch<AppActions>) => void;
	saveSettingOfPanel: (
		props: SaveDashboardProps,
	) => (dispatch: Dispatch<AppActions>) => void;
	getQueryResults: (
		props: GetQueryResultsProps,
	) => (dispatch: Dispatch<AppActions>) => void;
	updateQuery: (
		props: UpdateQueryProps,
	) => (dispatch: Dispatch<AppActions>) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	applySettingsToPanel: bindActionCreators(ApplySettingsToPanel, dispatch),
	saveSettingOfPanel: bindActionCreators(SaveDashboard, dispatch),
	getQueryResults: bindActionCreators(GetQueryResults, dispatch),
	updateQuery: bindActionCreators(UpdateQuery, dispatch),
});

type Props = DispatchProps & NewWidgetProps;

export default connect(null, mapDispatchToProps)(NewWidget);
