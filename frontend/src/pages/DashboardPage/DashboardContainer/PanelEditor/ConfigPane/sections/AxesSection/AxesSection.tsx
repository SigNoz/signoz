import type {
	SectionEditorProps,
	SectionKind,
} from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';

import ConfigField from '../../controls/ConfigField/ConfigField';
import ConfigFieldRow from '../../controls/ConfigFieldRow/ConfigFieldRow';
import ConfigNumberInput from '../../controls/ConfigNumberInput/ConfigNumberInput';
import ConfigTiles from '../../controls/ConfigTiles/ConfigTiles';
import { createFieldResetter } from '../../utils/changes';
import { AxisScale, SCALE_OPTIONS } from './options';

/**
 * Edits the `axes` slice of a panel spec: soft Y-axis min/max bounds and the
 * linear/logarithmic scale toggle. Each control is gated by its `controls` flag.
 */
function AxesSection({
	value,
	defaultValue,
	controls,
	onChange,
}: SectionEditorProps<SectionKind.Axes>): JSX.Element {
	const reset = createFieldResetter(value, defaultValue, onChange);

	return (
		<>
			{controls.minMax && (
				<ConfigField
					label="Y-axis range"
					help="The axis always shows at least this range. Data outside it still stretches the axis."
					{...reset('softMin', 'softMax')}
				>
					<ConfigFieldRow>
						<ConfigNumberInput
							testId="panel-editor-v2-soft-min"
							label="Min"
							value={value?.softMin}
							onChange={(softMin): void => onChange({ ...value, softMin })}
						/>
						<ConfigNumberInput
							testId="panel-editor-v2-soft-max"
							label="Max"
							value={value?.softMax}
							onChange={(softMax): void => onChange({ ...value, softMax })}
						/>
					</ConfigFieldRow>
				</ConfigField>
			)}

			{controls.logScale && (
				<ConfigField
					label="Y-axis scale"
					help="Logarithmic spreads out values that span several orders of magnitude."
					{...reset('isLogScale')}
				>
					<ConfigTiles
						testId="panel-editor-v2-log-scale"
						aria-label="Y-axis scale"
						value={value?.isLogScale ? AxisScale.LOG : AxisScale.LINEAR}
						items={SCALE_OPTIONS}
						onChange={(next): void =>
							onChange({ ...value, isLogScale: next === AxisScale.LOG })
						}
					/>
				</ConfigField>
			)}
		</>
	);
}

export default AxesSection;
