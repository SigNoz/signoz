import { SOMETHING_WENT_WRONG } from 'constants/api';
import { QueryParams } from 'constants/query';
import { initialQueriesMap, PANEL_TYPES } from 'constants/queryBuilder';
import { useUpdateDashboard } from 'hooks/dashboard/useUpdateDashboard';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useNotifications } from 'hooks/useNotifications';
import createQueryParams from 'lib/createQueryParams';
import history from 'lib/history';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { CSSProperties } from 'react';
import { v4 as uuid } from 'uuid';

import menuItems from './menuItems';
import { Card, Container, Text } from './styles';

function DashboardGraphSlider(): JSX.Element {
	const isDarkMode = useIsDarkMode();

	const {
		handleToggleDashboardSlider,
		layouts,
		selectedDashboard,
	} = useDashboard();

	const { data } = selectedDashboard || {};

	const { notifications } = useNotifications();

	const updateDashboardMutation = useUpdateDashboard();

	const onClickHandler = (name: PANEL_TYPES) => (): void => {
		const id = uuid();

		updateDashboardMutation.mutateAsync(
			{
				uuid: selectedDashboard?.uuid || '',
				data: {
					title: data?.title || '',
					variables: data?.variables || {},
					description: data?.description || '',
					name: data?.name || '',
					tags: data?.tags || [],
					layout: [
						{
							i: id,
							w: 6,
							x: 0,
							h: 3,
							y: 0,
						},
						...(layouts.filter((layout) => layout.i !== PANEL_TYPES.EMPTY_WIDGET) ||
							[]),
					],
					widgets: [
						...(data?.widgets || []),
						{
							id,
							title: '',
							description: '',
							isStacked: false,
							nullZeroValues: '',
							opacity: '',
							panelTypes: name,
							query: initialQueriesMap.metrics,
							timePreferance: 'GLOBAL_TIME',
							softMax: null,
							softMin: null,
						},
					],
				},
			},
			{
				onSuccess: (data) => {
					if (data.payload) {
						handleToggleDashboardSlider(false);

						const queryParams = {
							graphType: name,
							widgetId: id,
							[QueryParams.compositeQuery]: JSON.stringify(initialQueriesMap.metrics),
						};

						history.push(
							`${history.location.pathname}/new?${createQueryParams(queryParams)}`,
						);
					}
				},
				onError: () => {
					notifications.success({
						message: SOMETHING_WENT_WRONG,
					});
				},
			},
		);
	};

	const fillColor: CSSProperties['color'] = isDarkMode ? 'white' : 'black';

	return (
		<Container>
			{menuItems.map(({ name, Icon, display }) => (
				<Card onClick={onClickHandler(name)} id={name} key={name}>
					<Icon fillColor={fillColor} />
					<Text>{display}</Text>
				</Card>
			))}
		</Container>
	);
}

export default DashboardGraphSlider;
