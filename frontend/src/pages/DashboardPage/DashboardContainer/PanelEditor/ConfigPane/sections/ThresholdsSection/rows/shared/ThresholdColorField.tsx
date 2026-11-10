import { Typography } from '@signozhq/ui/typography';

import ColorSwatches from '../../../../controls/ColorSwatches/ColorSwatches';
import { COLOR_PRESETS } from '../../thresholdOptions';

import styles from '../../ThresholdsSection.module.scss';

interface ThresholdColorFieldProps {
	testId: string;
	value: string;
	onChange: (hex: string) => void;
}

const OPTIONS = COLOR_PRESETS.map((preset) => ({
	value: preset.value as string,
	id: preset.label.toLowerCase(),
	label: preset.label,
	fill: preset.value,
}));

/** Labelled color swatches, shared by every threshold variant. */
function ThresholdColorField({
	testId,
	value,
	onChange,
}: ThresholdColorFieldProps): JSX.Element {
	const preset = OPTIONS.find(
		(option) => option.value.toLowerCase() === value?.toLowerCase(),
	);

	return (
		<div className={styles.field}>
			<Typography.Text className={styles.fieldLabel}>Color</Typography.Text>
			<ColorSwatches
				testId={testId}
				label="Color"
				value={preset?.value}
				options={OPTIONS}
				onChange={onChange}
				custom={{
					value: preset ? undefined : value,
					initial: value,
					onChange,
				}}
			/>
		</div>
	);
}

export default ThresholdColorField;
