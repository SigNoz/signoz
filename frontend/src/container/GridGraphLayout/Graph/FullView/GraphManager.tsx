import { Button, Input } from 'antd';
import { CheckboxChangeEvent } from 'antd/es/checkbox';
import { ColumnType } from 'antd/es/table';
import { ChartData } from 'chart.js';
import { ResizeTable } from 'components/ResizeTable';
import { useNotifications } from 'hooks/useNotifications';
import isEqual from 'lodash-es/isEqual';
import { memo, useEffect, useState } from 'react';

import { getGraphVisibilityStateOnDataChange } from '../utils';
import { ColumnsTitle, DataIndexAndKey } from './contants';
import CustomCheckBox from './CustomeCheckBox';
import Label from './Label';
import {
	FilterTableAndSaveContainer,
	FilterTableContainer,
	SaveContainer,
} from './styles';
import { DataSetProps, ExtendedChartDataset, LegendEntryProps } from './types';
import {
	getDefaultTableDataSet,
	saveLegendEntriesToLocalStorage,
} from './utils';

function GraphManager({
	data,
	graphVisibilityStateHandler,
	name,
}: GraphManagerProps): JSX.Element {
	const [graphVisibilityState, setGraphVisibilityState] = useState<boolean[]>(
		Array(data.datasets.length).fill(true),
	);
	const [tableDataSet, setTableDataSet] = useState<ExtendedChartDataset[]>(
		getDefaultTableDataSet(data),
	);
	const [legendEntries, setLegendEntries] = useState<LegendEntryProps[]>([]);

	const { notifications } = useNotifications();

	useEffect(() => {
		if (graphVisibilityStateHandler) {
			graphVisibilityStateHandler([...graphVisibilityState]);
		}
	}, [graphVisibilityState, graphVisibilityStateHandler]);

	useEffect(() => {
		const newGraphVisibilityStates: boolean[] = Array(data.datasets.length).fill(
			true,
		);
		setTableDataSet(getDefaultTableDataSet(data));
		data.datasets.forEach((dataset, i) => {
			const index = legendEntries.findIndex(
				(legendEntry) => legendEntry.label === dataset.label,
			);
			if (index !== -1) {
				newGraphVisibilityStates[i] = legendEntries[index].show;
			}
		});
		setGraphVisibilityState(newGraphVisibilityStates);
	}, [data, legendEntries]);

	useEffect(() => {
		const visibilityStateAndLegendEntry = getGraphVisibilityStateOnDataChange(
			data,
			false,
			name,
		);
		setGraphVisibilityState(visibilityStateAndLegendEntry.graphVisibilityStates);
		setLegendEntries(visibilityStateAndLegendEntry.legendEntry);
	}, [data, name]);

	const checkBoxOnChangeHandler = (
		e: CheckboxChangeEvent,
		index: number,
	): void => {
		graphVisibilityState[index] = e.target.checked;
		setGraphVisibilityState([...graphVisibilityState]);
		if (graphVisibilityStateHandler) {
			graphVisibilityStateHandler(graphVisibilityState);
		}
	};

	const getCheckBox = (index: number): React.ReactElement => (
		<CustomCheckBox
			data={data}
			index={index}
			checkBoxOnChangeHandler={checkBoxOnChangeHandler}
			graphVisibilityState={graphVisibilityState}
		/>
	);

	const labelClickedHandler = (labelIndex: number): void => {
		const newGraphVisibilityStates = Array(data.datasets.length).fill(false);
		newGraphVisibilityStates[labelIndex] = true;
		setGraphVisibilityState([...newGraphVisibilityStates]);
		if (graphVisibilityStateHandler) {
			graphVisibilityStateHandler(newGraphVisibilityStates);
		}
	};

	const getLabel = (label: string, labelIndex: number): React.ReactElement => (
		<Label
			label={label}
			labelIndex={labelIndex}
			labelClickedHandler={labelClickedHandler}
		/>
	);

	const columns: ColumnType<DataSetProps>[] = [
		{
			title: '',
			width: 50,
			dataIndex: DataIndexAndKey[ColumnsTitle.Index],
			key: DataIndexAndKey.Index,
			render: (index: number): JSX.Element => getCheckBox(index),
		},
		{
			title: ColumnsTitle.Legend,
			width: 300,
			dataIndex: DataIndexAndKey[ColumnsTitle.Label],
			key: DataIndexAndKey.Label,
			render: (label: string, _, index): JSX.Element => getLabel(label, index),
		},
		{
			title: ColumnsTitle.Avg,
			width: 70,
			dataIndex: DataIndexAndKey[ColumnsTitle.Avg],
			key: DataIndexAndKey.Avg,
		},
		{
			title: ColumnsTitle.Sum,
			width: 70,
			dataIndex: DataIndexAndKey[ColumnsTitle.Sum],
			key: DataIndexAndKey.Sum,
		},
		{
			title: ColumnsTitle.Max,
			width: 70,
			dataIndex: DataIndexAndKey[ColumnsTitle.Max],
			key: DataIndexAndKey.Max,
		},
		{
			title: ColumnsTitle.Min,
			width: 70,
			dataIndex: DataIndexAndKey[ColumnsTitle.Min],
			key: DataIndexAndKey.Min,
		},
	];

	const filterHandler = (event: React.ChangeEvent<HTMLInputElement>): void => {
		const value = event.target.value.toString().toLowerCase();
		const updatedDataSet = tableDataSet.map((item) => {
			if (item.label?.toLocaleLowerCase().includes(value)) {
				return { ...item, show: true };
			}
			return { ...item, show: false };
		});
		setTableDataSet(updatedDataSet);
	};

	const saveHandler = (): void => {
		saveLegendEntriesToLocalStorage(data, graphVisibilityState, name);
		notifications.success({
			message: 'The updated graphs & legends are saved',
		});
		if (graphVisibilityStateHandler) {
			graphVisibilityStateHandler(graphVisibilityState);
		}
	};

	return (
		<FilterTableAndSaveContainer>
			<FilterTableContainer>
				<Input onChange={filterHandler} placeholder="Filter Series" />
				<ResizeTable
					columns={columns}
					dataSource={tableDataSet.filter((item) => item.show)}
					rowKey="index"
					pagination={false}
					scroll={{ y: 240 }}
				/>
			</FilterTableContainer>
			<SaveContainer>
				<Button className="save-container-button" type="default">
					Cancel
				</Button>
				<Button
					className="save-container-button"
					onClick={saveHandler}
					type="primary"
				>
					Save
				</Button>
			</SaveContainer>
		</FilterTableAndSaveContainer>
	);
}

interface GraphManagerProps {
	data: ChartData;
	graphVisibilityStateHandler?: (graphVisibilityArray: boolean[]) => void;
	name: string;
}

GraphManager.defaultProps = {
	graphVisibilityStateHandler: undefined,
};

export default memo(
	GraphManager,
	(prevProps, nextProps) =>
		isEqual(prevProps.data, nextProps.data) && prevProps.name === nextProps.name,
);
