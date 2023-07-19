import { Checkbox, ConfigProvider } from 'antd';

import { CheckBoxProps } from '../types';

function CustomCheckBox({
	data,
	index,
	graphVisibilityState,
	checkBoxOnChangeHandler,
}: CheckBoxProps): JSX.Element {
	const { datasets } = data;

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
			<Checkbox
				onChange={(e): void => checkBoxOnChangeHandler(e, index)}
				checked={graphVisibilityState[index]}
			/>
		</ConfigProvider>
	);
}

export default CustomCheckBox;
