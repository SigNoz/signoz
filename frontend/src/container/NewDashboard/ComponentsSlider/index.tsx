import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import createQueryParams from 'lib/createQueryParams';
import history from 'lib/history';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { LogsAggregatorOperator } from 'types/common/queryBuilder';
import { v4 as uuid } from 'uuid';

import { PANEL_TYPES_INITIAL_QUERY } from './constants';
import menuItems from './menuItems';
import { Card, Container, Text } from './styles';

function DashboardGraphSlider(): JSX.Element {
	const { handleToggleDashboardSlider } = useDashboard();

	// eslint-disable-next-line sonarjs/cognitive-complexity
	const onClickHandler = (name: PANEL_TYPES) => (): void => {
		const id = uuid();
		handleToggleDashboardSlider(false);
		const queryParamsLog = {
			graphType: name,
			widgetId: id,
			[QueryParams.compositeQuery]: JSON.stringify({
				...PANEL_TYPES_INITIAL_QUERY[name],
				builder: {
					...PANEL_TYPES_INITIAL_QUERY[name].builder,
					queryData: [
						{
							...PANEL_TYPES_INITIAL_QUERY[name].builder.queryData[0],
							aggregateOperator: LogsAggregatorOperator.NOOP,
							orderBy: [{ columnName: 'timestamp', order: 'desc' }],
							offset: 0,
							pageSize: 100,
						},
					],
				},
			}),
		};

		const queryParams = {
			graphType: name,
			widgetId: id,
			[QueryParams.compositeQuery]: JSON.stringify(
				PANEL_TYPES_INITIAL_QUERY[name],
			),
		};

		if (name === PANEL_TYPES.LIST) {
			history.push(
				`${history.location.pathname}/new?${createQueryParams(queryParamsLog)}`,
			);
		} else {
			history.push(
				`${history.location.pathname}/new?${createQueryParams(queryParams)}`,
			);
		}
	};

	return (
		<Container>
			{menuItems.map(({ name, icon, display }) => (
				<Card onClick={onClickHandler(name)} id={name} key={name}>
					{icon}
					<Text>{display}</Text>
				</Card>
			))}
		</Container>
	);
}

export default DashboardGraphSlider;
