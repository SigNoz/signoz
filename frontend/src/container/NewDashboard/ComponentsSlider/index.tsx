/* eslint-disable @typescript-eslint/naming-convention */
import { notification } from 'antd';
import { updateDashboard } from 'container/GridGraphLayout/utils';
import React, { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';
import DashboardReducer from 'types/reducer/dashboards';
import { v4 } from 'uuid';

import menuItems, { ITEMS } from './menuItems';
import { Card, Container, Text } from './styles';

function DashboardGraphSlider(): JSX.Element {
	const { dashboards } = useSelector<AppState, DashboardReducer>(
		(state) => state.dashboards,
	);

	const [selectedDashboard] = dashboards;
	const { data } = selectedDashboard;

	const onDragStartHandler: React.DragEventHandler<HTMLDivElement> = useCallback(
		(event: React.DragEvent<HTMLDivElement>) => {
			event.dataTransfer.setData('text/plain', event.currentTarget.id);
		},
		[],
	);

	const onClickHandler = useCallback(
		async (name: ITEMS) => {
			try {
				const generateWidgetId = v4();

				const getX = (): number => {
					if (data.layout && data.layout?.length > 0) {
						const lastIndexX = data.layout[(data.layout?.length || 0) - 1];
						return (lastIndexX.w + lastIndexX.x) % 12;
					}
					return 0;
				};

				await updateDashboard({
					data,
					generateWidgetId,
					graphType: name,
					layout: [
						...(data.layout || []),
						{
							h: 2,
							i: (((data.layout || [])?.length || 0) + 1).toString(),
							w: 6,
							x: getX(),
							y: 0,
						},
					],
					selectedDashboard,
				});
			} catch (error) {
				notification.error({
					message: 'Something went wrong',
				});
			}
		},
		[data, selectedDashboard],
	);
	const { isDarkMode } = useSelector<AppState, AppReducer>((state) => state.app);
	const fillColor: React.CSSProperties['color'] = isDarkMode ? 'white' : 'black';

	return (
		<Container>
			{menuItems.map(({ name, Icon, display }) => (
				<Card
					onClick={(): Promise<void> => onClickHandler(name)}
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
}

export type GRAPH_TYPES = ITEMS;

export default DashboardGraphSlider;
