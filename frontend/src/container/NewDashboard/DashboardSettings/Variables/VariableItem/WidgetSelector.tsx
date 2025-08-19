import { CustomMultiSelect } from 'components/NewSelect';
import { PANEL_GROUP_TYPES } from 'constants/queryBuilder';
import { generateGridTitle } from 'container/GridPanelSwitch/utils';
import { useDashboard } from 'providers/Dashboard/Dashboard';

export function WidgetSelector({
	selectedWidgets,
	setSelectedWidgets,
}: {
	selectedWidgets: string[];
	setSelectedWidgets: (widgets: string[]) => void;
}): JSX.Element {
	const { selectedDashboard } = useDashboard();

	// Get layout IDs for cross-referencing
	const layoutIds = new Set(
		(selectedDashboard?.data?.layout || []).map((item) => item.i),
	);

	// Filter and deduplicate widgets by ID, keeping only those with layout entries
	// and excluding row widgets since they are not panels that can have variables
	const widgets = Object.values(
		(selectedDashboard?.data?.widgets || []).reduce(
			(acc: Record<string, any>, widget) => {
				if (
					widget.id &&
					layoutIds.has(widget.id) &&
					widget.panelTypes !== PANEL_GROUP_TYPES.ROW
				) {
					acc[widget.id] = widget;
				}
				return acc;
			},
			{},
		),
	);

	return (
		<CustomMultiSelect
			placeholder="Select Panels"
			options={widgets.map((widget) => ({
				label: generateGridTitle(widget.title),
				value: widget.id,
			}))}
			value={selectedWidgets}
			onChange={(value): void => setSelectedWidgets(value as string[])}
			showLabels
		/>
	);
}
