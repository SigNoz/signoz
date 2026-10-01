import { Slider } from '@signozhq/ui/slider';

import styles from './ConfigSlider.module.scss';

interface ConfigSliderProps {
	testId: string;
	value: number;
	min: number;
	max: number;
	step: number;
	/** Renders the current value beside the track (e.g. as a percentage). */
	formatValue?: (value: number) => string;
	onChange: (value: number) => void;
}

/**
 * Numeric slider for the config sections. The design-system Slider is multi-thumb
 * capable, so its callback hands back `number | number[]`; this narrows to one thumb.
 */
function ConfigSlider({
	testId,
	value,
	min,
	max,
	step,
	formatValue,
	onChange,
}: ConfigSliderProps): JSX.Element {
	return (
		<div className={styles.row}>
			<Slider
				testId={testId}
				className={styles.slider}
				value={value}
				min={min}
				max={max}
				step={step}
				onChange={(next): void => onChange(Array.isArray(next) ? next[0] : next)}
			/>
			<span className={styles.value}>
				{formatValue ? formatValue(value) : value}
			</span>
		</div>
	);
}

export default ConfigSlider;
