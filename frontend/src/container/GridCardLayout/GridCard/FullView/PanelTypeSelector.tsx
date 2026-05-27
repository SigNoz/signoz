import { useCallback } from 'react';
import { SelectSimple } from '@signozhq/ui/select';
import { Typography } from '@signozhq/ui/typography';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { PanelTypesWithData } from 'container/DashboardContainer/PanelTypeSelectionModal/menuItems';
import { handleQueryChange } from 'container/NewWidget/utils';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import './PanelTypeSelector.scss';

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
		(value: string | string[]): void => {
			if (Array.isArray(value)) {
				return;
			}
			const newPanelType = value as PANEL_TYPES;
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
			<SelectSimple
				onChange={handleChange}
				value={selectedPanelType}
				style={{ width: '100%' }}
				className="panel-type-select"
				data-testid="panel-change-select"
				disabled={disabled}
				items={PanelTypesWithData.map((item) => ({
					value: item.name,
					label: (
						<div className="view-panel-select-option">
							<div className="icon">{item.icon}</div>
							<Typography.Text className="display">{item.display}</Typography.Text>
						</div>
					),
				}))}
			/>
		</div>
	);
}

PanelTypeSelector.defaultProps = {
	disabled: false,
};

export default PanelTypeSelector;
