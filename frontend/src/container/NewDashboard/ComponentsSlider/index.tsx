import './ComponentSlider.styles.scss';

import { Card, Modal } from 'antd';
import { Button } from 'antd/lib';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { useUpdateDashboard } from 'hooks/dashboard/useUpdateDashboard';
import { useNotifications } from 'hooks/useNotifications';
import createQueryParams from 'lib/createQueryParams';
import history from 'lib/history';
import { isEqual } from 'lodash-es';
import { ArrowRight } from 'lucide-react';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useState } from 'react';
import { LogsAggregatorOperator } from 'types/common/queryBuilder';
import { v4 as uuid } from 'uuid';

import {
	listViewInitialLogQuery,
	listViewInitialTraceQuery,
	PANEL_TYPES_INITIAL_QUERY,
} from './constants';
import menuItems from './menuItems';
import { Text } from './styles';

function DashboardGraphSlider(): JSX.Element {
	const {
		handleToggleDashboardSlider,
		layouts,
		selectedDashboard,
		isDashboardSliderOpen,
	} = useDashboard();

	const { data } = selectedDashboard || {};

	const { notifications } = useNotifications();

	const updateDashboardMutation = useUpdateDashboard();

	const [selectedPanelType, setSelectedPanelType] = useState<PANEL_TYPES>();

	// eslint-disable-next-line sonarjs/cognitive-complexity
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
					version: data?.version || 'v3',
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
							query:
								name === PANEL_TYPES.LIST
									? listViewInitialLogQuery
									: PANEL_TYPES_INITIAL_QUERY[name],
							timePreferance: 'GLOBAL_TIME',
							softMax: null,
							softMin: null,
							selectedLogFields: [
								{
									dataType: 'string',
									type: '',
									name: 'body',
								},
								{
									dataType: 'string',
									type: '',
									name: 'timestamp',
								},
							],
							selectedTracesFields: [
								...listViewInitialTraceQuery.builder.queryData[0].selectColumns,
							],
						},
					],
				},
			},
			{
				onSuccess: (data) => {
					if (data.payload) {
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
