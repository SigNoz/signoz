import { RadioGroup } from '@signozhq/ui/radio-group';

import styles from './SegmentedControl.module.scss';

export interface SegmentedControlOption<T extends string> {
	label: string;
	value: T;
}

interface SegmentedControlProps<T extends string> {
	value: T;
	options: SegmentedControlOption<T>[];
	onChange: (value: T) => void;
	testId?: string;
}

function SegmentedControl<T extends string>({
	value,
	options,
	onChange,
	testId,
}: SegmentedControlProps<T>): JSX.Element {
	return (
		<div className={styles.segmented}>
			<RadioGroup
				color="primary"
				value={value}
				onChange={(next): void => onChange(next as T)}
				testId={testId}
				items={options.map((option) => ({
					value: option.value,
					label: option.label,
					testId: testId ? `${testId}-${option.value}` : undefined,
				}))}
			/>
		</div>
	);
}

export default SegmentedControl;
