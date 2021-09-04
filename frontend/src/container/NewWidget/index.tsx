import { Button } from 'antd';
import ROUTES from 'constants/routes';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import updateUrl from 'lib/updateUrl';
import { DashboardWidgetPageParams } from 'pages/DashboardWidget';
import React, { useCallback, useState } from 'react';
import { useHistory, useParams } from 'react-router';

import LeftContainer from './LeftContainer';
import RightContainer from './RightContainer';
import {
	ButtonContainer,
	Container,
	LeftContainerWrapper,
	PanelContainer,
	RightContainerWrapper,
} from './styles';

const NewWidget = ({ selectedGraph }: NewWidgetProps): JSX.Element => {
	const { push } = useHistory();
	const { dashboardId } = useParams<DashboardWidgetPageParams>();

	const [title, setTitle] = useState<string>('');
	const [description, setDescription] = useState<string>('');
	const [stacked, setStacked] = useState<boolean>(false);
	const [opacity, setOpacity] = useState<string>('');
	const [selectedNullZeroValue, setSelectedNullZeroValue] = useState<string>(
		'zero',
	);

	const onClickApplyHandler = useCallback(() => {
		console.log('asd');
	}, []);

	const onClickSaveHandler = useCallback(() => {
		console.log('asd');
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
					<LeftContainer selectedGraph={selectedGraph} />
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
