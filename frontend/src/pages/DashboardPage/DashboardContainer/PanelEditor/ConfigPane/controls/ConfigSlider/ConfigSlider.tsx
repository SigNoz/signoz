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
 * Numeric slider for the config sections.
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
			<div className={styles.slider}>
				<Slider
					testId={testId}
					color="primary"
					value={value}
					min={min}
					max={max}
					step={step}
					onChange={onChange}
				/>
			</div>
			<span className={styles.value}>
				{formatValue ? formatValue(value) : value}
			</span>
		</div>
	);
}

export default ConfigSlider;
