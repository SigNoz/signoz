import { grey } from '@ant-design/colors';
import { Checkbox, ConfigProvider } from 'antd';
import { CheckboxChangeEvent } from 'antd/es/checkbox';

import { CheckBoxProps } from '../types';

function CustomCheckBox({
	data,
	index,
	graphVisibilityState,
	checkBoxOnChangeHandler,
}: CheckBoxProps): JSX.Element {
	const { datasets } = data;

	const onChangeHandler = (e: CheckboxChangeEvent): void => {
		checkBoxOnChangeHandler(e, index);
	};

	const color = datasets[index]?.borderColor?.toString() || grey[0];

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
			<Checkbox onChange={onChangeHandler} checked={graphVisibilityState[index]} />
		</ConfigProvider>
	);
}

export default CustomCheckBox;
