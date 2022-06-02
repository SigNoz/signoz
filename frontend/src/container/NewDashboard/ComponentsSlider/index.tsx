/* eslint-disable @typescript-eslint/naming-convention */
import { notification } from 'antd';
import { updateDashboard } from 'container/GridGraphLayout/utils';
import history from 'lib/history';
import React, { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';
import DashboardReducer from 'types/reducer/dashboards';
import { v4 as uuid } from 'uuid';

import menuItems, { ITEMS } from './menuItems';
import { Card, Container, Text } from './styles';

function DashboardGraphSlider(): JSX.Element {
	const { dashboards } = useSelector<AppState, DashboardReducer>(
		(state) => state.dashboards,
	);

	const [selectedDashboard] = dashboards;
	const { data } = selectedDashboard;

	const onClickHandler = useCallback(
		async (name: ITEMS) => {
			try {
				const emptyLayout = data.layout?.find((e) => e.i === 'empty');

				const isEmptyLayout = emptyLayout !== undefined;

				if (!isEmptyLayout) {
					const getX = (): number => {
						if (data.layout && data.layout?.length > 0) {
							const lastIndexX = data.layout[(data.layout?.length || 0) - 1];
							return (lastIndexX.w + lastIndexX.x) % 12;
						}
						return 0;
					};

					const uniqueId = uuid();

					await updateDashboard({
						data,
						generateWidgetId: uniqueId,
						graphType: name,
						layout: [
							...(data.layout || []),
							{
								h: 2,
								i: uniqueId,
								w: 6,
								x: getX(),
								y: 0,
							},
						],
						selectedDashboard,
						isRedirected: true,
					});
				} else {
					history.push(
						`${history.location.pathname}/new?graphType=${name}&widgetId=${emptyLayout.i}`,
					);
				}
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
					onClick={(event): void => {
						event.preventDefault();
						onClickHandler(name);
					}}
					id={name}
					key={name}
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
