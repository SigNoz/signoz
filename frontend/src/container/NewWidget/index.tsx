import { Button } from 'antd';
import ROUTES from 'constants/routes';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import updateUrl from 'lib/updateUrl';
import { DashboardWidgetPageParams } from 'pages/DashboardWidget';
import React, { useCallback, useMemo, useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { useHistory, useLocation, useParams } from 'react-router';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { ApplySettingsToPanel, ApplySettingsToPanelProps } from 'store/actions';
import {
	SaveDashboard,
	SaveDashboardProps,
} from 'store/actions/dashboard/saveDashboard';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
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

const NewWidget = ({
	selectedGraph,
	applySettingsToPanel,
	saveSettingOfPanel,
}: Props): JSX.Element => {
	const { dashboards } = useSelector<AppState, DashboardReducer>(
		(state) => state.dashboards,
	);
	const [selectedDashboard] = dashboards;

	const widgets = selectedDashboard.data.widgets;

	const { push } = useHistory();
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

	const [stacked, setStacked] = useState<boolean>(
		selectedWidget?.isStacked || false,
	);
	const [opacity, setOpacity] = useState<string>(selectedWidget?.opacity || '1');
	const [selectedNullZeroValue, setSelectedNullZeroValue] = useState<string>(
		selectedWidget?.nullZeroValues || 'zero',
	);

	const getSelectedTime = useCallback(
		() =>
			timeItems.find(
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
			widgetId: query.get('widgetId') || '',
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
	]);

	const onClickApplyHandler = useCallback(() => {
		applySettingsToPanel({
			description,
			isStacked: stacked,
			nullZeroValues: selectedNullZeroValue,
			opacity,
			timePreferance: selectedTime.enum,
			title,
			widgetId: selectedWidget?.id || '',
		});
	}, [
		applySettingsToPanel,
		description,
		opacity,
		selectedTime,
		selectedWidget?.id,
		selectedNullZeroValue,
		stacked,
		title,
	]);

	const onClickDiscardHandler = useCallback(() => {
		push(updateUrl(ROUTES.DASHBOARD, ':dashboardId', dashboardId));
	}, [dashboardId, push]);

	return (
		<Container>
			<ButtonContainer>
				<Button onClick={onClickSaveHandler}>Save</Button>
				<Button onClick={onClickApplyHandler}>Apply</Button>
				<Button onClick={onClickDiscardHandler}>Discard</Button>
			</ButtonContainer>

			<PanelContainer>
				<LeftContainerWrapper flex={5}>
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

interface DispatchProps {
	applySettingsToPanel: (
		props: ApplySettingsToPanelProps,
	) => (dispatch: Dispatch<AppActions>) => void;
	saveSettingOfPanel: (
		props: SaveDashboardProps,
	) => (dispatch: Dispatch<AppActions>) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	applySettingsToPanel: bindActionCreators(ApplySettingsToPanel, dispatch),
	saveSettingOfPanel: bindActionCreators(SaveDashboard, dispatch),
});

type Props = DispatchProps & NewWidgetProps;

export default connect(null, mapDispatchToProps)(NewWidget);
