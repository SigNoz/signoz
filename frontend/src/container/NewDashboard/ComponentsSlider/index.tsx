import React, { useCallback } from 'react';

import menuItems, { ITEMS } from './menuItems';
import { Card, Container, Text } from './styles';

const DashboardGraphSlider = (): JSX.Element => {
	const onDragStartHandler: React.DragEventHandler<HTMLDivElement> = useCallback(
		(event: React.DragEvent<HTMLDivElement>) => {
			event.dataTransfer.setData('text/plain', event.currentTarget.id);
		},
		[],
	);
	return (
		<Container>
			{menuItems.map(({ name, Icon, display }) => (
				<Card id={name} onDragStart={onDragStartHandler} key={name} draggable>
					<Icon />
					<Text>{display}</Text>
				</Card>
			))}
		</Container>
	);
};

export type GRAPH_TYPES = ITEMS;

export default DashboardGraphSlider;
