import { DEFAULT_OPACITY_FILL } from 'lib/visualization/colorRamp/colorScale';

import ColorSwatches from '../../controls/ColorSwatches/ColorSwatches';
import ConfigField from '../../controls/ConfigField/ConfigField';
import type { FieldResetProps } from '../../utils/changes';
import { FILL_OPTIONS, GROUP_FILL, isSameColor } from './heatmapColorOptions';

interface HeatmapFillFieldProps extends Partial<FieldResetProps> {
	/** Empty follows the selected group's legend colour. */
	value: string | undefined;
	onChange: (fill: string) => void;
	/** Off for a chart with no group colour to follow; empty then reads as the default fill. */
	withGroupColor?: boolean;
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
	withGroupColor = true,
}: HeatmapFillFieldProps): JSX.Element {
	const options = withGroupColor
		? FILL_OPTIONS
		: FILL_OPTIONS.filter((option) => option.value !== GROUP_FILL);
	const current = value || (withGroupColor ? GROUP_FILL : DEFAULT_OPACITY_FILL);
	const selected = current
		? options.find((option) => isSameColor(option.value, current))?.value
		: GROUP_FILL;

	return (
		<ConfigField
			label="Base color"
			help={
				withGroupColor ? 'Group color gives each group its own color.' : undefined
			}
			changed={changed}
			onReset={onReset}
		>
			<ColorSwatches
				testId="panel-editor-v2-heatmap-fill"
				label="Base color"
				value={selected}
				options={options}
				dividerAfter={withGroupColor ? 0 : undefined}
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
