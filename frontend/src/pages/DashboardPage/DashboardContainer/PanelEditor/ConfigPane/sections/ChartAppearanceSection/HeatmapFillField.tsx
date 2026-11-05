import { DEFAULT_OPACITY_FILL } from 'lib/uPlotV2/plugins/HeatmapPlugin/colorScale';

import ColorSwatches from '../../controls/ColorSwatches/ColorSwatches';
import ConfigField from '../../controls/ConfigField/ConfigField';
import type { FieldResetProps } from '../../utils/changes';
import { FILL_OPTIONS, GROUP_FILL, isSameColor } from './heatmapColorOptions';

interface HeatmapFillFieldProps extends Partial<FieldResetProps> {
	/** Empty follows the selected group's legend colour. */
	value: string | undefined;
	onChange: (fill: string) => void;
}

/**
 * The colour opacity mode ramps the alpha of. Any hex goes, since the point of
 * the fill is matching whatever else the dashboard already uses.
 */
function HeatmapFillField({
	value,
	onChange,
	changed,
	onReset,
}: HeatmapFillFieldProps): JSX.Element {
	const selected = value
		? FILL_OPTIONS.find((option) => isSameColor(option.value, value))?.value
		: GROUP_FILL;

	return (
		<ConfigField
			label="Base color"
			help="Group color gives each group its own color."
			changed={changed}
			onReset={onReset}
		>
			<ColorSwatches
				testId="panel-editor-v2-heatmap-fill"
				label="Base color"
				value={selected}
				options={FILL_OPTIONS}
				dividerAfter={0}
				onChange={onChange}
				custom={{
					value: selected === undefined ? value : undefined,
					initial: value || DEFAULT_OPACITY_FILL,
					onChange,
				}}
			/>
		</ConfigField>
	);
}

export default HeatmapFillField;
