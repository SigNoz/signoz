import { Button, Input } from 'antd';
import { CheckboxChangeEvent } from 'antd/es/checkbox';
import { ColumnType } from 'antd/es/table';
import { ResizeTable } from 'components/ResizeTable';
import { useNotifications } from 'hooks/useNotifications';
import isEqual from 'lodash-es/isEqual';
import { memo, useEffect, useState } from 'react';

import { getGraphVisibilityStateOnDataChange } from '../utils';
import { ColumnsKeyAndDataIndex, ColumnsTitle } from './contants';
import {
	FilterTableAndSaveContainer,
	FilterTableContainer,
	SaveContainer,
} from './styles';
import CustomCheckBox from './TableRender/CustomCheckBox';
import Label from './TableRender/Label';
import {
	DataSetProps,
	ExtendedChartDataset,
	GraphManagerProps,
	LegendEntryProps,
} from './types';
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
		const visibilityStateAndLegendEntry = getGraphVisibilityStateOnDataChange({
			data,
			isExpandedName: false,
			name,
		});
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

	const columns: ColumnType<DataSetProps>[] = [
		{
			title: '',
			width: 50,
			dataIndex: ColumnsKeyAndDataIndex.Index,
			key: ColumnsKeyAndDataIndex.Index,
			render: (index: number): JSX.Element => getCheckBox(index),
		},
		{
			title: ColumnsTitle[ColumnsKeyAndDataIndex.Label],
			width: 300,
			dataIndex: ColumnsKeyAndDataIndex.Label,
			key: ColumnsKeyAndDataIndex.Label,
			render: (label: string, _, index): JSX.Element => (
				<Label
					label={label}
					labelIndex={index}
					labelClickedHandler={labelClickedHandler}
				/>
			),
		},
		{
			title: ColumnsTitle[ColumnsKeyAndDataIndex.Avg],
			width: 70,
			dataIndex: ColumnsKeyAndDataIndex.Avg,
			key: ColumnsKeyAndDataIndex.Avg,
		},
		{
			title: ColumnsTitle[ColumnsKeyAndDataIndex.Sum],
			width: 70,
			dataIndex: ColumnsKeyAndDataIndex.Sum,
			key: ColumnsKeyAndDataIndex.Sum,
		},
		{
			title: ColumnsTitle[ColumnsKeyAndDataIndex.Max],
			width: 70,
			dataIndex: ColumnsKeyAndDataIndex.Max,
			key: ColumnsKeyAndDataIndex.Max,
		},
		{
			title: ColumnsTitle[ColumnsKeyAndDataIndex.Min],
			width: 70,
			dataIndex: ColumnsKeyAndDataIndex.Min,
			key: ColumnsKeyAndDataIndex.Min,
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
		saveLegendEntriesToLocalStorage({
			data,
			graphVisibilityState,
			name,
		});
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

GraphManager.defaultProps = {
	graphVisibilityStateHandler: undefined,
};

export default memo(
	GraphManager,
	(prevProps, nextProps) =>
		isEqual(prevProps.data, nextProps.data) && prevProps.name === nextProps.name,
);
