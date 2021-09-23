import { Typography } from 'antd';
import React from 'react';

import { ColorContainer, Container } from './styles';

const Legend = ({ text, color }: LegendProps): JSX.Element => {
	if (text.length === 0) {
		return <></>;
	}

	return (
		<Container>
			<ColorContainer color={color}></ColorContainer>
			<Typography>{text}</Typography>
		</Container>
	);
};

interface LegendProps {
	text: string;
	color: string;
}

export default Legend;
