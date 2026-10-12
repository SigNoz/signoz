import type {
	SectionEditorProps,
	SectionKind,
} from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';
import { DEFAULT_BAR_COLOR } from 'pages/DashboardPage/DashboardContainer/Panels/kinds/TopListPanel/constants';

import ConfigSwitch from '../../controls/ConfigSwitch/ConfigSwitch';
import { SWITCH_SKETCHES } from '../../controls/drawings/switchSketches';
import { createFieldResetter } from '../../utils/changes';
import BarColorField from './BarColorField';

/**
 * Edits the `appearance` slice of a Top List panel spec: bar color, row numbers and
 * each row's share of the listed total. Each control is gated by its `controls` flag.
 */
function AppearanceSection({
	value,
	savedValue,
	controls,
	onChange,
}: SectionEditorProps<SectionKind.Appearance>): JSX.Element {
	const reset = createFieldResetter(value, savedValue, onChange);
	const appearance = {
		...value,
		barColor: value?.barColor || DEFAULT_BAR_COLOR,
	};

	return (
		<>
			{controls.barColor && (
				<BarColorField
					{...reset('barColor')}
					value={appearance.barColor}
					onChange={(barColor): void => onChange({ ...appearance, barColor })}
				/>
			)}

			{controls.showRank && (
				<ConfigSwitch
					testId="panel-editor-v2-show-rank"
					title="Show rank"
					description="Numbers each row by its position."
					sketch={SWITCH_SKETCHES.rank}
					changed={reset('showRank').changed}
					value={appearance.showRank ?? false}
					onChange={(showRank): void => onChange({ ...appearance, showRank })}
				/>
			)}

			{controls.showShare && (
				<ConfigSwitch
					testId="panel-editor-v2-show-share"
					title="Show share of total"
					description="Each row's percentage of the listed rows' sum. Suits counts and sums, not averages or percentiles."
					sketch={SWITCH_SKETCHES.share}
					changed={reset('showShare').changed}
					value={appearance.showShare ?? false}
					onChange={(showShare): void => onChange({ ...appearance, showShare })}
				/>
			)}
		</>
	);
}

export default AppearanceSection;
