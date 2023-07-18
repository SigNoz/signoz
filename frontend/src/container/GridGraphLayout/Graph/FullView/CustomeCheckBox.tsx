import { Checkbox, ConfigProvider } from 'antd';
import { CheckboxChangeEvent } from 'antd/es/checkbox';
import { ChartData } from 'chart.js';

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

interface CheckBoxProps {
	data: ChartData;
	index: number;
	graphVisibilityState: boolean[];
	checkBoxOnChangeHandler: (e: CheckboxChangeEvent, index: number) => void;
}

export default CustomCheckBox;
