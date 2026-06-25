import { Typography } from '@signozhq/ui/typography';
import { Select } from 'antd';
import { popupContainer } from 'utils/selectPopupContainer';

import { RuleMode } from './types';
import styles from './VolumeControlConfig.module.scss';

interface LabelSelectorProps {
	mode: RuleMode;
	options: string[];
	value: string[];
	onChange: (labels: string[]) => void;
	loading?: boolean;
}

function LabelSelector({
	mode,
	options,
	value,
	onChange,
	loading,
}: LabelSelectorProps): JSX.Element {
	const helpText =
		mode === 'include'
			? 'Only the selected attributes will remain queryable.'
			: 'The selected attributes will be aggregated away; all others stay queryable.';

	return (
		<div className={styles.field} data-testid="volume-control-label-selector">
			<Typography.Text className={styles.fieldLabel}>Attributes</Typography.Text>
			<Typography.Text className={styles.fieldHint}>{helpText}</Typography.Text>
			<Select
				mode="multiple"
				className={styles.labelSelect}
				placeholder="Select attributes"
				value={value}
				onChange={onChange}
				loading={loading}
				options={options.map((key) => ({ label: key, value: key }))}
				getPopupContainer={popupContainer}
				data-testid="volume-control-label-select"
			/>
		</div>
	);
}

export default LabelSelector;
