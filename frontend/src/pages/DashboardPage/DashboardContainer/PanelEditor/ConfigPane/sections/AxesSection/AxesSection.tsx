import type {
	SectionEditorProps,
	SectionKind,
} from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';

import ConfigField from '../../controls/ConfigField/ConfigField';
import ConfigInlineField from '../../controls/ConfigInlineField/ConfigInlineField';
import ConfigRangeInput from '../../controls/ConfigRangeInput/ConfigRangeInput';
import ConfigTiles from '../../controls/ConfigTiles/ConfigTiles';
import { createFieldResetter } from '../../utils/changes';
import { AxisScale, RANGE_HELP, SCALE_HELP, SCALE_OPTIONS } from './options';

import styles from './AxesSection.module.scss';

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
	const scale = value?.isLogScale ? AxisScale.LOG : AxisScale.LINEAR;

	return (
		<ConfigField label="Y axis" {...reset('softMin', 'softMax', 'isLogScale')}>
			<div className={styles.fields}>
				{controls.minMax && (
					<ConfigInlineField label="Range" help={RANGE_HELP}>
						<ConfigRangeInput
							testIdPrefix="panel-editor-v2"
							min={value?.softMin}
							max={value?.softMax}
							onChangeMin={(softMin): void => onChange({ ...value, softMin })}
							onChangeMax={(softMax): void => onChange({ ...value, softMax })}
						/>
					</ConfigInlineField>
				)}

				{controls.logScale && (
					<ConfigField label="Scale" help={SCALE_HELP[scale]}>
						<ConfigTiles
							testId="panel-editor-v2-log-scale"
							aria-label="Y-axis scale"
							value={scale}
							items={SCALE_OPTIONS}
							onChange={(next): void =>
								onChange({ ...value, isLogScale: next === AxisScale.LOG })
							}
						/>
					</ConfigField>
				)}
			</div>
		</ConfigField>
	);
}

export default AxesSection;
