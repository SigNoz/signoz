import ColorSwatches from '../../controls/ColorSwatches/ColorSwatches';
import ConfigField from '../../controls/ConfigField/ConfigField';
import type { FieldResetProps } from '../../utils/changes';
import { BAR_COLOR_OPTIONS, findBarColorPreset } from './barColorOptions';

interface BarColorFieldProps extends Partial<FieldResetProps> {
	value: string;
	onChange: (barColor: string) => void;
}

function BarColorField({
	value,
	onChange,
	changed,
	onReset,
}: BarColorFieldProps): JSX.Element {
	const preset = findBarColorPreset(value);

	return (
		<ConfigField
			label="Bar color"
			help="Fills every row's bar."
			changed={changed}
			onReset={onReset}
		>
			<ColorSwatches
				testId="panel-editor-v2-bar-color"
				label="Bar color"
				value={preset}
				options={BAR_COLOR_OPTIONS}
				onChange={onChange}
				custom={{
					value: preset ? undefined : value,
					initial: value,
					onChange,
				}}
			/>
		</ConfigField>
	);
}

export default BarColorField;
