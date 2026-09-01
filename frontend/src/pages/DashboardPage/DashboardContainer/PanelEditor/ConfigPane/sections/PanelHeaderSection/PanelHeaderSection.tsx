import type {
	SectionEditorProps,
	SectionKind,
} from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';

import ConfigSwitch from '../../controls/ConfigSwitch/ConfigSwitch';

/** Edits the Text panel's `headerOptions` slice: the panel card's title strip. */
function PanelHeaderSection({
	value,
	onChange,
}: SectionEditorProps<SectionKind.PanelHeader>): JSX.Element {
	return (
		<ConfigSwitch
			testId="panel-header-hide"
			title="Hide header"
			description="Drop the title strip on the dashboard; hovering the panel brings it back for drag and actions."
			value={value?.hide === true}
			onChange={(hide): void => onChange({ ...value, hide })}
		/>
	);
}

export default PanelHeaderSection;
