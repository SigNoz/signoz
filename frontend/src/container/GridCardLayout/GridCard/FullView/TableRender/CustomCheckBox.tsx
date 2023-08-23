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

	return (
		<ConfigProvider
			theme={{
				token: {
					colorPrimary: datasets[index].borderColor?.toString(),
					colorBorder: datasets[index].borderColor?.toString(),
					colorBgContainer: datasets[index].borderColor?.toString(),
				},
			}}
		>
			<Checkbox onChange={onChangeHandler} checked={graphVisibilityState[index]} />
		</ConfigProvider>
	);
}

export default CustomCheckBox;
