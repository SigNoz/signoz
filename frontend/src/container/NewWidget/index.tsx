import { Button } from 'antd';
import ROUTES from 'constants/routes';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import updateUrl from 'lib/updateUrl';
import { DashboardWidgetPageParams } from 'pages/DashboardWidget';
import React, { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { useHistory, useLocation, useParams } from 'react-router';
import { AppState } from 'store/reducers';
import { Widgets } from 'types/api/dashboard/getAll';
import DashboardReducer from 'types/reducer/dashboards';

import LeftContainer from './LeftContainer';
import RightContainer from './RightContainer';
import timeItems, { timePreferance } from './RightContainer/timeItems';
import {
	ButtonContainer,
	Container,
	LeftContainerWrapper,
	PanelContainer,
	RightContainerWrapper,
} from './styles';

const NewWidget = ({ selectedGraph }: NewWidgetProps): JSX.Element => {
	const { dashboards } = useSelector<AppState, DashboardReducer>(
		(state) => state.dashboards,
	);
	const [selectedDashboard] = dashboards;

	const widgets = selectedDashboard.data.widgets;

	const { push } = useHistory();
	const { search } = useLocation();
	const query = new URLSearchParams(search);

	const { dashboardId } = useParams<DashboardWidgetPageParams>();

	const getWidget = useCallback(() => {
		const widgetId = query.get('widgetId');
		return widgets?.find((e) => e.id === widgetId);
	}, []);

	const selectedWidget = getWidget() as Widgets;

	const [title, setTitle] = useState<string>(selectedWidget.title);
	const [description, setDescription] = useState<string>(
		selectedWidget.description,
	);

	const [stacked, setStacked] = useState<boolean>(selectedWidget.isStacked);
	const [opacity, setOpacity] = useState<string>(selectedWidget.opacity);
	const [selectedNullZeroValue, setSelectedNullZeroValue] = useState<string>(
		selectedWidget.nullZeroValues,
	);

	const getSelectedTime = useCallback(() => {
		return timeItems.find((e) => e.enum === selectedWidget.timePreferance);
	}, []);

	const [selectedTime, setSelectedTime] = useState<timePreferance>({
		name: getSelectedTime()?.name || '',
		enum: selectedWidget.timePreferance,
	});

	const onClickApplyHandler = useCallback(() => {
		// update the global state
	}, []);

	const onClickSaveHandler = useCallback(() => {
		// on fire the PUT request which update the dashboard and onClickDiscardHandler
	}, []);

	const onClickDiscardHandler = useCallback(() => {
		push(updateUrl(ROUTES.DASHBOARD, ':dashboardId', dashboardId));
	}, []);

	return (
		<Container>
			<ButtonContainer>
				<Button onClick={onClickSaveHandler}>Save</Button>
				<Button onClick={onClickApplyHandler}>Apply</Button>
				<Button onClick={onClickDiscardHandler}>Discard</Button>
			</ButtonContainer>

			<PanelContainer>
				<LeftContainerWrapper flex={2.5}>
					<LeftContainer selectedTime={selectedTime} selectedGraph={selectedGraph} />
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
							setOpacity,
							selectedNullZeroValue,
							setSelectedNullZeroValue,
							selectedGraph,
							setSelectedTime,
							selectedTime,
						}}
					/>
				</RightContainerWrapper>
			</PanelContainer>
		</Container>
	);
};

export interface NewWidgetProps {
	selectedGraph: GRAPH_TYPES;
}

export default NewWidget;
