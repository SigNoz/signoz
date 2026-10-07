import type {
	SectionEditorProps,
	SectionKind,
} from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';

import ConfigSwitch from '../../controls/ConfigSwitch/ConfigSwitch';
import { SWITCH_SKETCHES } from '../../controls/drawings/switchSketches';

/** Edits the Text panel's `headerOptions` slice: the panel card's title strip. */
function PanelHeaderSection({
	value,
	onChange,
}: SectionEditorProps<SectionKind.PanelHeader>): JSX.Element {
	const hide = value?.hide === true;

	return (
		<ConfigSwitch
			testId="panel-header-hide"
			title="Hide panel header"
			description="Removes the title strip on the dashboard. The drag handle and actions appear on hover."
			sketch={SWITCH_SKETCHES.hideHeader}
			changed={hide}
			value={hide}
			onChange={(next): void => onChange({ ...value, hide: next })}
		/>
	);
}

export default PanelHeaderSection;
