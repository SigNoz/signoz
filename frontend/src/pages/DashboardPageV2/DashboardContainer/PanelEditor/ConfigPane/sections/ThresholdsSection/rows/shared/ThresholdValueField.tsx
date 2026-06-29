import { Typography } from '@signozhq/ui/typography';
import { Input } from 'antd';

import styles from '../../ThresholdsSection.module.scss';

interface ThresholdValueFieldProps {
	testId: string;
	value: number;
	/** Receives the raw input string; the draft hook parses it. */
	onChange: (raw: string) => void;
}

/** Labelled numeric "Value" input, shared by every threshold variant. */
function ThresholdValueField({
	testId,
	value,
	onChange,
}: ThresholdValueFieldProps): JSX.Element {
	return (
		<div className={styles.field}>
			<Typography.Text className={styles.fieldLabel}>Value</Typography.Text>
			<Input
				data-testid={testId}
				type="number"
				placeholder="Value"
				value={value}
				onChange={(e): void => onChange(e.target.value)}
			/>
		</div>
	);
}

export default ThresholdValueField;
