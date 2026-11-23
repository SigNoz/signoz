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
			<div className={styles.slider}>
				<Slider.Range
					testId={testId}
					color="primary"
					value={value}
					min={min}
					max={max}
					step={step}
					onChange={([a, b]): void => {
						onChange([Math.min(a, b), Math.max(a, b)]);
					}}
				/>
			</div>
			<span className={styles.value}>
				{formatValue ? formatValue(value) : `${value[0]}–${value[1]}`}
			</span>
		</div>
	);
}

export default ConfigRangeSlider;
