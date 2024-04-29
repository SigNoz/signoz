import './ComponentSlider.styles.scss';

import { Card, Modal } from 'antd';
import { Button } from 'antd/lib';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import createQueryParams from 'lib/createQueryParams';
import history from 'lib/history';
import { isEqual } from 'lodash-es';
import { ArrowRight } from 'lucide-react';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useState } from 'react';
import { LogsAggregatorOperator } from 'types/common/queryBuilder';
import { v4 as uuid } from 'uuid';

import { PANEL_TYPES_INITIAL_QUERY } from './constants';
import menuItems from './menuItems';
import { Text } from './styles';

function DashboardGraphSlider(): JSX.Element {
	const { handleToggleDashboardSlider, isDashboardSliderOpen } = useDashboard();

	const [selectedPanelType, setSelectedPanelType] = useState<PANEL_TYPES>();

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

	const handleCardClick = (panelType: PANEL_TYPES): void => {
		if (!isEqual(panelType, selectedPanelType)) setSelectedPanelType(panelType);
	};

	return (
		<Modal
			open={isDashboardSliderOpen}
			onCancel={(): void => {
				handleToggleDashboardSlider(false);
				setSelectedPanelType(undefined);
			}}
			rootClassName="graph-selection"
			footer={
				<Button
					type="primary"
					icon={<ArrowRight size={14} />}
					onClick={(): void => {
						if (selectedPanelType) {
							onClickHandler(selectedPanelType)();
							setSelectedPanelType(undefined);
						}
					}}
				>
					Select and next
				</Button>
			}
			title="New Panel"
		>
			<div className="panel-selection">
				{menuItems.map(({ name, icon, display }) => (
					<Card
						onClick={(): void => handleCardClick(name)}
						id={name}
						key={name}
						className={selectedPanelType === name ? 'selected' : ''}
					>
						{icon}
						<Text>{display}</Text>
					</Card>
				))}
			</div>
		</Modal>
	);
}

export default DashboardGraphSlider;
