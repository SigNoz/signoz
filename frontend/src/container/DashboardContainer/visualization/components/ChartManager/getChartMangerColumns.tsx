import { ColumnType } from 'antd/es/table';
import { PrecisionOption, PrecisionOptionsEnum } from 'components/Graph/types';
import CustomCheckBox from 'container/GridCardLayout/GridCard/FullView/TableRender/CustomCheckBox';

import { SeriesLabel } from './SeriesLabel';
import {
	ExtendedChartDataset,
	formatTableValueWithUnit,
	getTableColumnTitle,
} from './utils';

export interface GetChartManagerColumnsParams {
	tableDataSet: ExtendedChartDataset[];
	graphVisibilityState: boolean[];
	onToggleSeriesOnOff: (index: number) => void;
	onToggleSeriesVisibility: (index: number) => void;
	yAxisUnit?: string;
	decimalPrecision?: PrecisionOption;
	isGraphDisabled?: boolean;
}

export function getChartManagerColumns({
	tableDataSet,
	graphVisibilityState,
	onToggleSeriesOnOff,
	onToggleSeriesVisibility,
	yAxisUnit,
	decimalPrecision = PrecisionOptionsEnum.TWO,
	isGraphDisabled,
}: GetChartManagerColumnsParams): ColumnType<ExtendedChartDataset>[] {
	return [
		{
			title: '',
			width: 50,
			dataIndex: 'index',
			key: 'index',
			render: (_: unknown, record: ExtendedChartDataset): JSX.Element => (
				<CustomCheckBox
					data={tableDataSet}
					graphVisibilityState={graphVisibilityState}
					index={record.index}
					disabled={isGraphDisabled}
					checkBoxOnChangeHandler={(_e, idx): void => onToggleSeriesOnOff(idx)}
				/>
			),
		},
		{
			title: 'Label',
			width: 300,
			dataIndex: 'label',
			key: 'label',
			render: (label: string, record: ExtendedChartDataset): JSX.Element => (
				<SeriesLabel
					label={label ?? ''}
					labelIndex={record.index}
					disabled={isGraphDisabled}
					onClick={onToggleSeriesVisibility}
				/>
			),
		},
		{
			title: getTableColumnTitle('Avg', yAxisUnit),
			width: 90,
			dataIndex: 'avg',
			key: 'avg',
			render: (val: number | undefined): string =>
				formatTableValueWithUnit(val ?? 0, yAxisUnit, decimalPrecision),
		},
		{
			title: getTableColumnTitle('Sum', yAxisUnit),
			width: 90,
			dataIndex: 'sum',
			key: 'sum',
			render: (val: number | undefined): string =>
				formatTableValueWithUnit(val ?? 0, yAxisUnit, decimalPrecision),
		},
		{
			title: getTableColumnTitle('Max', yAxisUnit),
			width: 90,
			dataIndex: 'max',
			key: 'max',
			render: (val: number | undefined): string =>
				formatTableValueWithUnit(val ?? 0, yAxisUnit, decimalPrecision),
		},
		{
			title: getTableColumnTitle('Min', yAxisUnit),
			width: 90,
			dataIndex: 'min',
			key: 'min',
			render: (val: number | undefined): string =>
				formatTableValueWithUnit(val ?? 0, yAxisUnit, decimalPrecision),
		},
	];
}
