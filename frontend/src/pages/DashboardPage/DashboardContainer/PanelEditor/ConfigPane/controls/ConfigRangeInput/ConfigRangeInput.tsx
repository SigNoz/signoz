import ConfigNumberInput from '../ConfigNumberInput/ConfigNumberInput';

import styles from './ConfigRangeInput.module.scss';

interface ConfigRangeInputProps {
	/** Prefix for the `-soft-min` / `-soft-max` test ids. */
	testIdPrefix: string;
	min: number | null | undefined;
	max: number | null | undefined;
	onChangeMin: (next: number | null) => void;
	onChangeMax: (next: number | null) => void;
}

function ConfigRangeInput({
	testIdPrefix,
	min,
	max,
	onChangeMin,
	onChangeMax,
}: ConfigRangeInputProps): JSX.Element {
	return (
		<div className={styles.range}>
			<ConfigNumberInput
				testId={`${testIdPrefix}-soft-min`}
				placeholder="Min"
				value={min}
				onChange={onChangeMin}
			/>
			<span className={styles.dash}>–</span>
			<ConfigNumberInput
				testId={`${testIdPrefix}-soft-max`}
				placeholder="Max"
				value={max}
				onChange={onChangeMax}
			/>
		</div>
	);
}

export default ConfigRangeInput;
