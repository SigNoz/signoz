import { Slider } from '@signozhq/ui/slider';

import styles from './ConfigRangeSlider.module.scss';

interface ConfigRangeSliderProps {
	testId: string;
	value: [number, number];
	min: number;
	max: number;
	step: number;
	formatValue?: (value: [number, number]) => string;
	onChange: (value: [number, number]) => void;
}

function ConfigRangeSlider({
	testId,
	value,
	min,
	max,
	step,
	formatValue,
	onChange,
}: ConfigRangeSliderProps): JSX.Element {
	return (
		<div className={styles.row}>
			<Slider
				range
				testId={testId}
				className={styles.slider}
				value={value}
				min={min}
				max={max}
				step={step}
				onChange={(next): void => {
					if (Array.isArray(next) && next.length === 2) {
						onChange([Math.min(next[0], next[1]), Math.max(next[0], next[1])]);
					}
				}}
			/>
			<span className={styles.value}>
				{formatValue ? formatValue(value) : `${value[0]}–${value[1]}`}
			</span>
		</div>
	);
}

export default ConfigRangeSlider;
