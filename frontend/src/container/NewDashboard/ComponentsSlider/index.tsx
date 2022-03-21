import React, { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';
import { v4 } from 'uuid';

import menuItems, { ITEMS } from './menuItems';
import { Card, Container, Text } from './styles';

const DashboardGraphSlider = (): JSX.Element => {
	const onDragStartHandler: React.DragEventHandler<HTMLDivElement> = useCallback(
		(event: React.DragEvent<HTMLDivElement>) => {
			event.dataTransfer.setData('text/plain', event.currentTarget.id);
		},
		[],
	);
	const { push } = useHistory();
	const { pathname } = useLocation();

	const onClickHandler = useCallback(
		(name: ITEMS) => {
			const generateWidgetId = v4();
			push(`${pathname}/new?graphType=${name}&widgetId=${generateWidgetId}`);
		},
		[push, pathname],
	);
	const { isDarkMode } = useSelector<AppState, AppReducer>((state) => state.app);
	const fillColor: React.CSSProperties['color'] = isDarkMode ? 'white' : 'black';
	return (
		<Container>
			{menuItems.map(({ name, Icon, display }) => (
				<Card
					onClick={(): void => onClickHandler(name)}
					id={name}
					onDragStart={onDragStartHandler}
					key={name}
					draggable
				>
					<Icon fillColor={fillColor} />
					<Text>{display}</Text>
				</Card>
			))}
		</Container>
	);
};

export type GRAPH_TYPES = ITEMS;

export default DashboardGraphSlider;
