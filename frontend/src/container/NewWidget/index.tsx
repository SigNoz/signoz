import { Col } from 'antd';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import React from 'react';

import LeftContainer from './LeftContainer';
import RightContainer from './RightContainer';
import {
	Container,
	LeftContainerWrapper,
	RightContainerWrapper,
} from './styles';

const NewWidget = ({ selectedGraph }: NewWidgetProps): JSX.Element => {
	return (
		<Container>
			<LeftContainerWrapper flex={2.5}>
				<LeftContainer selectedGraph={selectedGraph} />
			</LeftContainerWrapper>

			<RightContainerWrapper flex={1}>
				<RightContainer selectedGraph={selectedGraph} />
			</RightContainerWrapper>
		</Container>
	);
};

export interface NewWidgetProps {
	selectedGraph: GRAPH_TYPES;
}

export default NewWidget;
