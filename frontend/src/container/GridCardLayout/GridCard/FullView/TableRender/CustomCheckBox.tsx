import { grey } from '@ant-design/colors';
import { Checkbox, ConfigProvider } from 'antd';
import { CheckboxChangeEvent } from 'antd/es/checkbox';

import { CheckBoxProps } from '../types';

function CustomCheckBox({
	data,
	index,
	graphVisibilityState = [],
	checkBoxOnChangeHandler,
	disabled = false,
}: CheckBoxProps): JSX.Element {
	const onChangeHandler = (e: CheckboxChangeEvent): void => {
		checkBoxOnChangeHandler(e, index);
	};

	const color = data[index]?.stroke?.toString() || grey[0];

	const isChecked = graphVisibilityState[index] || false;

	return (
		<ConfigProvider
			theme={{
				token: {
					colorPrimary: color,
					colorBorder: color,
					colorBgContainer: color,
				},
			}}
		>
			<Checkbox
				onChange={onChangeHandler}
				checked={isChecked}
				disabled={disabled}
			/>
		</ConfigProvider>
	);
}

export default CustomCheckBox;
