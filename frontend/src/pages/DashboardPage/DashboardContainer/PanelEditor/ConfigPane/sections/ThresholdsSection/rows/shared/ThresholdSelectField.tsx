import { Typography } from '@signozhq/ui/typography';

import ConfigSelect, {
	type ConfigSelectItem,
} from '../../../../controls/ConfigSelect/ConfigSelect';

import styles from '../../ThresholdsSection.module.scss';

interface ThresholdSelectFieldProps {
	label: string;
	testId: string;
	placeholder?: string;
	value: string | undefined;
	items: ConfigSelectItem[];
	onChange: (value: string) => void;
}

/**
 * Labelled single-select, shared by the threshold variants' enum fields
 * (operator / display format / column).
 */
function ThresholdSelectField({
	label,
	testId,
	placeholder,
	value,
	items,
	onChange,
}: ThresholdSelectFieldProps): JSX.Element {
	return (
		<div className={styles.field}>
			<Typography
				variant="paragraph"
				size="base"
				weight="regular"
				color="secondary"
				as="span"
				textOverflow="wrap"
			>
				{label}
			</Typography>
			<ConfigSelect
				testId={testId}
				placeholder={placeholder}
				value={value}
				items={items}
				onChange={onChange}
			/>
		</div>
	);
}

export default ThresholdSelectField;
