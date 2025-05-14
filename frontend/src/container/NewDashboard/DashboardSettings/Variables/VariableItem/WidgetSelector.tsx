import { CustomMultiSelect } from 'components/NewSelect';
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

	const widgets = selectedDashboard?.data?.widgets || [];

	return (
		<CustomMultiSelect
			placeholder="Select Widgets"
			options={widgets.map((widget) => ({
				label: generateGridTitle(widget.title),
				value: widget.id,
			}))}
			value={selectedWidgets}
			labelInValue
			onChange={(value): void => setSelectedWidgets(value as string[])}
			showLabels
		/>
	);
}
