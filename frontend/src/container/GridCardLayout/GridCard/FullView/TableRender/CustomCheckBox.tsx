import { grey } from '@ant-design/colors';
import { Checkbox } from '@signozhq/ui/checkbox';
import { CSSProperties } from 'react';

import { CheckBoxProps } from '../types';
import styles from './CustomCheckBox.module.scss';

function CustomCheckBox({
	data,
	index,
	graphVisibilityState = [],
	checkBoxOnChangeHandler,
	disabled = false,
}: CheckBoxProps): JSX.Element {
	const color = data[index]?.stroke?.toString() || grey[0];
	const isChecked = graphVisibilityState[index] || false;

	const colorStyle = {
		'--series-color': color,
	} as CSSProperties;

	return (
		<span className={styles.wrapper} style={colorStyle}>
			<Checkbox
				onChange={(checked): void => checkBoxOnChangeHandler(checked, index)}
				value={isChecked}
				disabled={disabled}
			/>
		</span>
	);
}

export default CustomCheckBox;
