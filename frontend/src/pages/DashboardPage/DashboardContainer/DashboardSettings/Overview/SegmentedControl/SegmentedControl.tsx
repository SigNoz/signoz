import { RadioGroup, RadioGroupItem } from '@signozhq/ui/radio-group';

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

/**
 * Connected pill segmented control composed on top of @signozhq/ui RadioGroup:
 * the radio circle is collapsed into a transparent full-cell click target and
 * the label becomes the visible segment (highlighted via the radio's stable
 * `data-state="checked"`). Keeps radio semantics + keyboard nav.
 */
function SegmentedControl<T extends string>({
	value,
	options,
	onChange,
	testId,
}: SegmentedControlProps<T>): JSX.Element {
	return (
		<RadioGroup
			className={styles.segmented}
			value={value}
			onChange={(next): void => onChange(next as T)}
			testId={testId}
		>
			{options.map((option) => (
				<RadioGroupItem
					key={option.value}
					value={option.value}
					containerClassName={styles.segment}
					className={styles.segmentInput}
					testId={testId ? `${testId}-${option.value}` : undefined}
				>
					{option.label}
				</RadioGroupItem>
			))}
		</RadioGroup>
	);
}

export default SegmentedControl;
