import './PanelTypeSelector.scss';

import { Select, Typography } from 'antd';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import GraphTypes from 'container/NewDashboard/ComponentsSlider/menuItems';
import { handleQueryChange } from 'container/NewWidget/utils';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useCallback } from 'react';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

const { Option } = Select;

interface PanelTypeSelectorProps {
	selectedPanelType: PANEL_TYPES;
	disabled?: boolean;
	query: Query;
	widgetId: string;
}

function PanelTypeSelector({
	selectedPanelType,
	disabled = false,
	query,
	widgetId,
}: PanelTypeSelectorProps): JSX.Element {
	const { redirectWithQueryBuilderData } = useQueryBuilder();

	const handleChange = useCallback(
		(newPanelType: PANEL_TYPES): void => {
			// Transform the query for the new panel type using handleQueryChange
			const transformedQuery = handleQueryChange(
				newPanelType as any,
				query,
				selectedPanelType,
			);

			// Use redirectWithQueryBuilderData to update URL with transformed query and new panel type
			redirectWithQueryBuilderData(
				transformedQuery,
				{
					[QueryParams.expandedWidgetId]: widgetId,
					[QueryParams.graphType]: newPanelType,
				},
				undefined,
				true,
			);
		},
		[redirectWithQueryBuilderData, query, selectedPanelType, widgetId],
	);

	return (
		<div className="panel-type-selector">
			<Select
				onChange={handleChange}
				value={selectedPanelType}
				style={{ width: '100%' }}
				className="panel-type-select"
				data-testid="panel-change-select"
				disabled={disabled}
			>
				{GraphTypes.map((item) => (
					<Option key={item.name} value={item.name}>
						<div className="view-panel-select-option">
							<div className="icon">{item.icon}</div>
							<Typography.Text className="display">{item.display}</Typography.Text>
						</div>
					</Option>
				))}
			</Select>
		</div>
	);
}

PanelTypeSelector.defaultProps = {
	disabled: false,
};

export default PanelTypeSelector;
