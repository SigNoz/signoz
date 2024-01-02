import { CheckboxChangeEvent } from 'antd/es/checkbox';
import { ColumnType } from 'antd/es/table';

import { ColumnsKeyAndDataIndex, ColumnsTitle } from '../contants';
import { DataSetProps, ExtendedChartDataset } from '../types';
import { getGraphManagerTableHeaderTitle } from '../utils';
import CustomCheckBox from './CustomCheckBox';
import { getLabel } from './GetLabel';

export const getGraphManagerTableColumns = ({
	tableDataSet,
	checkBoxOnChangeHandler,
	graphVisibilityState,
	labelClickedHandler,
	yAxisUnit,
	isGraphDisabled,
}: GetGraphManagerTableColumnsProps): ColumnType<DataSetProps>[] => [
	{
		title: '',
		width: 50,
		dataIndex: ColumnsKeyAndDataIndex.Index,
		key: ColumnsKeyAndDataIndex.Index,
		render: (_: string, record: DataSetProps): JSX.Element => (
			<CustomCheckBox
				data={tableDataSet}
				index={record.index}
				checkBoxOnChangeHandler={checkBoxOnChangeHandler}
				graphVisibilityState={graphVisibilityState}
				disabled={isGraphDisabled}
			/>
		),
	},
	{
		title: ColumnsTitle[ColumnsKeyAndDataIndex.Label],
		width: 300,
		dataIndex: ColumnsKeyAndDataIndex.Label,
		key: ColumnsKeyAndDataIndex.Label,
		...getLabel(labelClickedHandler, isGraphDisabled),
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
	tableDataSet: ExtendedChartDataset[];
	checkBoxOnChangeHandler: (e: CheckboxChangeEvent, index: number) => void;
	labelClickedHandler: (labelIndex: number) => void;
	graphVisibilityState: boolean[];
	yAxisUnit?: string;
	isGraphDisabled?: boolean;
}
