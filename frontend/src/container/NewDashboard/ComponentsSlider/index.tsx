import './ComponentSlider.styles.scss';

import { Card, Modal } from 'antd';
import logEvent from 'api/common/logEvent';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import createQueryParams from 'lib/createQueryParams';
import history from 'lib/history';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { LogsAggregatorOperator } from 'types/common/queryBuilder';
import { v4 as uuid } from 'uuid';

import { PANEL_TYPES_INITIAL_QUERY } from './constants';
import menuItems from './menuItems';
import { Text } from './styles';

function DashboardGraphSlider(): JSX.Element {
	const { handleToggleDashboardSlider, isDashboardSliderOpen } = useDashboard();

	// eslint-disable-next-line sonarjs/cognitive-complexity
	const onClickHandler = (name: PANEL_TYPES) => (): void => {
		const id = uuid();
		handleToggleDashboardSlider(false);
		logEvent('Dashboard Detail: New panel type selected', {
			// dashboardId: '',
			// dashboardName: '',
			// numberOfPanels: 0, // todo - at this point we don't know these attributes
			panelType: name,
			widgetId: id,
		});
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

	const handleCardClick = (panelType: PANEL_TYPES): void => {
		onClickHandler(panelType)();
	};

	return (
		<Modal
			open={isDashboardSliderOpen}
			onCancel={(): void => {
				handleToggleDashboardSlider(false);
			}}
			rootClassName="graph-selection"
			footer={null}
			title="New Panel"
		>
			<div className="panel-selection">
				{menuItems.map(({ name, icon, display }) => (
					<Card onClick={(): void => handleCardClick(name)} id={name} key={name}>
						{icon}
						<Text>{display}</Text>
					</Card>
				))}
			</div>
		</Modal>
	);
}

export default DashboardGraphSlider;
