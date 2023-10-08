import { CheckboxChangeEvent } from 'antd/es/checkbox';
import { ColumnType } from 'antd/es/table';
import { ChartData } from 'chart.js';

import { ColumnsKeyAndDataIndex, ColumnsTitle } from '../contants';
import { DataSetProps } from '../types';
import { getGraphManagerTableHeaderTitle } from '../utils';
import CustomCheckBox from './CustomCheckBox';
import { getLabel } from './GetLabel';

export const getGraphManagerTableColumns = ({
	data,
	checkBoxOnChangeHandler,
	graphVisibilityState,
	labelClickedHandler,
	yAxisUnit,
}: GetGraphManagerTableColumnsProps): ColumnType<DataSetProps>[] => [
	{
		title: '',
		width: 50,
		dataIndex: ColumnsKeyAndDataIndex.Index,
		key: ColumnsKeyAndDataIndex.Index,
		render: (_: string, __: DataSetProps, index: number): JSX.Element => (
			<CustomCheckBox
				data={data}
				index={index}
				checkBoxOnChangeHandler={checkBoxOnChangeHandler}
				graphVisibilityState={graphVisibilityState}
			/>
		),
	},
	{
		title: ColumnsTitle[ColumnsKeyAndDataIndex.Label],
		width: 300,
		dataIndex: ColumnsKeyAndDataIndex.Label,
		key: ColumnsKeyAndDataIndex.Label,
		...getLabel(labelClickedHandler),
	},
	{
		title: getGraphManagerTableHeaderTitle(
			ColumnsTitle[ColumnsKeyAndDataIndex.Avg],
			yAxisUnit,
		),
		width: 90,
		dataIndex: ColumnsKeyAndDataIndex.Avg,
		key: ColumnsKeyAndDataIndex.Avg,
	},
	{
		title: getGraphManagerTableHeaderTitle(
			ColumnsTitle[ColumnsKeyAndDataIndex.Sum],
			yAxisUnit,
		),
		width: 90,
		dataIndex: ColumnsKeyAndDataIndex.Sum,
		key: ColumnsKeyAndDataIndex.Sum,
	},
	{
		title: getGraphManagerTableHeaderTitle(
			ColumnsTitle[ColumnsKeyAndDataIndex.Max],
			yAxisUnit,
		),
		width: 90,
		dataIndex: ColumnsKeyAndDataIndex.Max,
		key: ColumnsKeyAndDataIndex.Max,
	},
	{
		title: getGraphManagerTableHeaderTitle(
			ColumnsTitle[ColumnsKeyAndDataIndex.Min],
			yAxisUnit,
		),
		width: 90,
		dataIndex: ColumnsKeyAndDataIndex.Min,
		key: ColumnsKeyAndDataIndex.Min,
	},
];

interface GetGraphManagerTableColumnsProps {
	data: ChartData;
	checkBoxOnChangeHandler: (e: CheckboxChangeEvent, index: number) => void;
	labelClickedHandler: (labelIndex: number) => void;
	graphVisibilityState: boolean[];
	yAxisUnit?: string;
}
