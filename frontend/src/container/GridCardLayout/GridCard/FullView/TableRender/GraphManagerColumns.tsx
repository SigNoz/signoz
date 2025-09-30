import { CheckboxChangeEvent } from 'antd/es/checkbox';
import { ColumnType } from 'antd/es/table';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';

import { ColumnsKeyAndDataIndex, ColumnsTitle } from '../contants';
import { DataSetProps, ExtendedChartDataset } from '../types';
import { getGraphManagerTableHeaderTitle } from '../utils';
import CustomCheckBox from './CustomCheckBox';
import { getLabel } from './GetLabel';

// Helper function to format numeric values based on yAxisUnit
const formatMetricValue = (value: number, yAxisUnit?: string): string => {
	if (yAxisUnit) {
		return getYAxisFormattedValue(value.toString(), yAxisUnit);
	}
	return value.toString();
};

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
		render: (value: number): string => formatMetricValue(value, yAxisUnit),
	},
	{
		title: getGraphManagerTableHeaderTitle(
			ColumnsTitle[ColumnsKeyAndDataIndex.Sum],
			yAxisUnit,
		),
		width: 90,
		dataIndex: ColumnsKeyAndDataIndex.Sum,
		key: ColumnsKeyAndDataIndex.Sum,
		render: (value: number): string => formatMetricValue(value, yAxisUnit),
	},
	{
		title: getGraphManagerTableHeaderTitle(
			ColumnsTitle[ColumnsKeyAndDataIndex.Max],
			yAxisUnit,
		),
		width: 90,
		dataIndex: ColumnsKeyAndDataIndex.Max,
		key: ColumnsKeyAndDataIndex.Max,
		render: (value: number): string => formatMetricValue(value, yAxisUnit),
	},
	{
		title: getGraphManagerTableHeaderTitle(
			ColumnsTitle[ColumnsKeyAndDataIndex.Min],
			yAxisUnit,
		),
		width: 90,
		dataIndex: ColumnsKeyAndDataIndex.Min,
		key: ColumnsKeyAndDataIndex.Min,
		render: (value: number): string => formatMetricValue(value, yAxisUnit),
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
