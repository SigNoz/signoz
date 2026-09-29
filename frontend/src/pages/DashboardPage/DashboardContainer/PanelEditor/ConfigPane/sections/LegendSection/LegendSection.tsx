import type {
	SectionEditorProps,
	SectionKind,
} from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';

import ConfigField from '../../controls/ConfigField/ConfigField';
import ConfigTiles from '../../controls/ConfigTiles/ConfigTiles';
import LegendColors from '../../controls/LegendColors/LegendColors';
import type { SectionEditorContext } from '../../sectionContext';
import { createFieldResetter } from '../../utils/changes';
import { POSITION_OPTIONS } from './options';

type LegendSectionProps = SectionEditorProps<SectionKind.Legend> &
	Pick<SectionEditorContext, 'legendSeries'>;

/**
 * Edits the `legend` slice of a panel spec: legend position and per-series color
 * overrides. The colors control reads the panel's resolved series from context (the
 * shared preview query) and writes `customColors` keyed by series label.
 */
function LegendSection({
	value,
	defaultValue,
	controls,
	onChange,
	legendSeries,
}: LegendSectionProps): JSX.Element {
	const reset = createFieldResetter(value, defaultValue, onChange);

	return (
		<>
			{controls.position && (
				<ConfigField label="Position" {...reset('position')}>
					<ConfigTiles
						testId="panel-editor-v2-legend-position"
						aria-label="Legend position"
						items={POSITION_OPTIONS}
						value={value?.position ?? defaultValue?.position}
						onChange={(position): void => onChange({ ...value, position })}
					/>
				</ConfigField>
			)}

			{controls.colors && (
				<ConfigField label="Series colors" {...reset('customColors')}>
					<LegendColors
						series={legendSeries ?? []}
						value={value?.customColors}
						onChange={(customColors): void => onChange({ ...value, customColors })}
					/>
				</ConfigField>
			)}
		</>
	);
}

export default LegendSection;
