import { ChevronDown } from '@signozhq/icons';
import { ColorPicker } from 'antd';

import styles from './ThresholdsSection.module.scss';

interface ThresholdColorSelectProps {
	value: string;
	testId?: string;
	onChange: (hex: string) => void;
}

// Named presets from the SigNoz palette (cherry / amber / forest / robin). They surface
// as quick swatches in the picker; the full picker below covers any custom color.
const PRESETS: { label: string; value: string }[] = [
	{ label: 'Red', value: '#F1575F' },
	{ label: 'Orange', value: '#F5B225' },
	{ label: 'Green', value: '#2BB673' },
	{ label: 'Blue', value: '#4E74F8' },
];

/**
 * Threshold color control: an antd ColorPicker with the palette presets plus a full
 * custom picker, in a single popover (so moving from the trigger into the picker never
 * dismisses it). The trigger shows the current swatch and its preset name, or "Custom".
 */
function ThresholdColorSelect({
	value,
	testId,
	onChange,
}: ThresholdColorSelectProps): JSX.Element {
	const current = PRESETS.find(
		(p) => p.value.toLowerCase() === value?.toLowerCase(),
	);

	return (
		<ColorPicker
			value={value}
			onChangeComplete={(c): void => onChange(c.toHexString())}
			presets={[{ label: 'Defaults', colors: PRESETS.map((p) => p.value) }]}
		>
			<button type="button" className={styles.colorTrigger} data-testid={testId}>
				<span className={styles.dot} style={{ backgroundColor: value }} />
				<span className={styles.colorLabel}>{current?.label ?? 'Custom'}</span>
				<ChevronDown size={13} />
			</button>
		</ColorPicker>
	);
}

export default ThresholdColorSelect;
