import { Col } from 'antd';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import React from 'react';

import LeftContainer from './LeftContainer';
import RightContainer from './RightContainer';
import { Container } from './styles';

const NewWidget = ({ selectedGraph }: NewWidgetProps): JSX.Element => {
	return (
		<Container>
			<Col flex={2.5}>
				<LeftContainer selectedGraph={selectedGraph} />
			</Col>

			<Col flex={1}>
				<RightContainer selectedGraph={selectedGraph} />
			</Col>
		</Container>
	);
};

export interface NewWidgetProps {
	selectedGraph: GRAPH_TYPES;
}

export default NewWidget;
