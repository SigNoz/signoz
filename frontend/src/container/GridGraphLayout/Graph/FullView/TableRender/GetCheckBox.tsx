import { CheckboxChangeEvent } from 'antd/es/checkbox';
import { ColumnType } from 'antd/es/table';
import { ChartData } from 'chart.js';

import { DataSetProps } from '../types';
import CustomCheckBox from './CustomCheckBox';

export const getCheckBox = ({
	data,
	checkBoxOnChangeHandler,
	graphVisibilityState,
}: GetCheckBoxProps): ColumnType<DataSetProps> => ({
	render: (index: number): JSX.Element => (
		<CustomCheckBox
			data={data}
			index={index}
			checkBoxOnChangeHandler={checkBoxOnChangeHandler}
			graphVisibilityState={graphVisibilityState}
		/>
	),
});

interface GetCheckBoxProps {
	data: ChartData;
	checkBoxOnChangeHandler: (e: CheckboxChangeEvent, index: number) => void;
	graphVisibilityState: boolean[];
}
