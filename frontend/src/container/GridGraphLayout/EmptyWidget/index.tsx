import { Typography } from 'antd';
import React from 'react';

import { Container } from './styles';

function EmptyWidget(): JSX.Element {
	return (
		<Container>
			<Typography>
				Click one of the widget types above (Time Series / Value) to add here
			</Typography>
		</Container>
	);
}

export default EmptyWidget;
