import { Checkbox, ConfigProvider } from 'antd';
import { CheckboxChangeEvent } from 'antd/es/checkbox';
import { ChartData } from 'chart.js';

function CheckBox({
	data,
	index,
	graphVisibilityArray,
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
				checked={graphVisibilityArray[index]}
			/>
		</ConfigProvider>
	);
}

interface CheckBoxProps {
	data: ChartData;
	index: number;
	graphVisibilityArray: boolean[];
	checkBoxOnChangeHandler: (e: CheckboxChangeEvent, index: number) => void;
}

export default CheckBox;
