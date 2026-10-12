import ConfigNumberInput from '../ConfigNumberInput/ConfigNumberInput';

import { isRangeInverted } from './utils';

import styles from './ConfigRangeInput.module.scss';

interface ConfigRangeInputProps {
	minTestId: string;
	maxTestId: string;
	min: number | null | undefined;
	max: number | null | undefined;
	onChangeMin: (next: number | null) => void;
	onChangeMax: (next: number | null) => void;
}

function ConfigRangeInput({
	minTestId,
	maxTestId,
	min,
	max,
	onChangeMin,
	onChangeMax,
}: ConfigRangeInputProps): JSX.Element {
	const inverted = isRangeInverted(min, max);

	return (
		<div className={styles.range}>
			<ConfigNumberInput
				testId={minTestId}
				placeholder="Min"
				invalid={inverted}
				value={min}
				onChange={onChangeMin}
			/>
			<span className={styles.dash}>–</span>
			<ConfigNumberInput
				testId={maxTestId}
				placeholder="Max"
				invalid={inverted}
				value={max}
				onChange={onChangeMax}
			/>
		</div>
	);
}

export default ConfigRangeInput;
