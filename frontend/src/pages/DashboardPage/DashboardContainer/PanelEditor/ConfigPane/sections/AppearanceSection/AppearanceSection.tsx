import type {
	SectionEditorProps,
	SectionKind,
} from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';

import ConfigSwitch from '../../controls/ConfigSwitch/ConfigSwitch';
import { SWITCH_SKETCHES } from '../../controls/drawings/switchSketches';
import { createFieldResetter } from '../../utils/changes';

/**
 * Edits the `appearance` slice of a Top List panel spec: row numbers and each row's
 * share of the listed total. Each control is gated by its `controls` flag.
 */
function AppearanceSection({
	value,
	savedValue,
	controls,
	onChange,
}: SectionEditorProps<SectionKind.Appearance>): JSX.Element {
	const reset = createFieldResetter(value, savedValue, onChange);

	return (
		<>
			{controls.showRank && (
				<ConfigSwitch
					testId="panel-editor-v2-show-rank"
					title="Show rank"
					description="Numbers each row by its position."
					sketch={SWITCH_SKETCHES.rank}
					changed={reset('showRank').changed}
					value={value?.showRank ?? false}
					onChange={(showRank): void => onChange({ ...value, showRank })}
				/>
			)}

			{controls.showShare && (
				<ConfigSwitch
					testId="panel-editor-v2-show-share"
					title="Show share of total"
					description="Each row's percentage of the listed rows' sum. Suits counts and sums, not averages or percentiles."
					sketch={SWITCH_SKETCHES.share}
					changed={reset('showShare').changed}
					value={value?.showShare ?? false}
					onChange={(showShare): void => onChange({ ...value, showShare })}
				/>
			)}
		</>
	);
}

export default AppearanceSection;
