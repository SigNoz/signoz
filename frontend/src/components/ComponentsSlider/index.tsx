import React from 'react';

import menuItems from './menuItems';
import { Card, Container, Text } from './styles';

const DashboardGraphSlider = (): JSX.Element => {
	return (
		<Container>
			{menuItems.map(({ name, Icon }) => (
				<Card key={name} draggable>
					<Icon />
					<Text>{name}</Text>
				</Card>
			))}
		</Container>
	);
};

export default DashboardGraphSlider;
