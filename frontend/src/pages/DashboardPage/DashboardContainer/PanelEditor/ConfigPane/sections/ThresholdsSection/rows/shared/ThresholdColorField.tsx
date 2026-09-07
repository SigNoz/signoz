import { Typography } from '@signozhq/ui/typography';

import ThresholdColorSelect from '../../ThresholdColorSelect';

import styles from '../../ThresholdsSection.module.scss';

interface ThresholdColorFieldProps {
	testId: string;
	value: string;
	onChange: (hex: string) => void;
}

/** Labelled color picker, shared by every threshold variant. */
function ThresholdColorField({
	testId,
	value,
	onChange,
}: ThresholdColorFieldProps): JSX.Element {
	return (
		<div className={styles.field}>
			<Typography.Text className={styles.fieldLabel}>Color</Typography.Text>
			<ThresholdColorSelect value={value} testId={testId} onChange={onChange} />
		</div>
	);
}

export default ThresholdColorField;
