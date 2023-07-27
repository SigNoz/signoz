import { Button, Input } from 'antd';
import { CheckboxChangeEvent } from 'antd/es/checkbox';
import { ColumnType } from 'antd/es/table';
import { ResizeTable } from 'components/ResizeTable';
import { useNotifications } from 'hooks/useNotifications';
import isEqual from 'lodash-es/isEqual';
import { memo, useEffect, useMemo, useState } from 'react';
import { eventEmitter } from 'utils/getEventEmitter';

import { getGraphVisibilityStateOnDataChange } from '../utils';
import { ColumnsKeyAndDataIndex, ColumnsTitle } from './contants';
import {
	FilterTableAndSaveContainer,
	FilterTableContainer,
	SaveContainer,
} from './styles';
import CustomCheckBox from './TableRender/CustomCheckBox';
import Label from './TableRender/Label';
import { DataSetProps, ExtendedChartDataset, GraphManagerProps } from './types';
import {
	getDefaultTableDataSet,
	saveLegendEntriesToLocalStorage,
} from './utils';

function GraphManager({
	data,
	name,
	onToggleModelHandler,
}: GraphManagerProps): JSX.Element {
	const { graphVisibilityStates: storedVisibilityStates, legendEntry } = useMemo(
		() =>
			getGraphVisibilityStateOnDataChange({
				data,
				isExpandedName: false,
				name,
			}),
		[data, name],
	);

	const [graphVisibilityState, setGraphVisibilityState] = useState<boolean[]>(
		storedVisibilityStates,
	);
	const [tableDataSet, setTableDataSet] = useState<ExtendedChartDataset[]>(
		getDefaultTableDataSet(data),
	);

	const { notifications } = useNotifications();

	useEffect(() => {
		const newGraphVisibilityStates: boolean[] = Array(data.datasets.length).fill(
			true,
		);
		data.datasets.forEach((dataset, i) => {
			const index = legendEntry.findIndex(
				(entry) => entry.label === dataset.label,
			);
			if (index !== -1) {
				newGraphVisibilityStates[i] = legendEntry[index].show;
			}
		});
		eventEmitter.emit('UPDATE_GRAPH_VISIBILITY_STATE', {
			name,
			graphVisibilityStates: newGraphVisibilityStates,
		});
		setGraphVisibilityState(newGraphVisibilityStates);
	}, [data, name, legendEntry]);

	const checkBoxOnChangeHandler = (
		e: CheckboxChangeEvent,
		index: number,
	): void => {
		graphVisibilityState[index] = e.target.checked;
		setGraphVisibilityState([...graphVisibilityState]);
		eventEmitter.emit('UPDATE_GRAPH_VISIBILITY_STATE', {
			name,
			graphVisibilityStates: [...graphVisibilityState],
		});
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
		const newGraphVisibilityStates = Array<boolean>(data.datasets.length).fill(
			false,
		);
		newGraphVisibilityStates[labelIndex] = true;
		setGraphVisibilityState([...newGraphVisibilityStates]);
		eventEmitter.emit('UPDATE_GRAPH_VISIBILITY_STATE', {
			name,
			graphVisibilityStates: newGraphVisibilityStates,
		});
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
	};

	const dataSource = tableDataSet.filter((item) => item.show);

	return (
		<FilterTableAndSaveContainer>
			<FilterTableContainer>
				<Input onChange={filterHandler} placeholder="Filter Series" />
				<ResizeTable
					columns={columns}
					dataSource={dataSource}
					rowKey="index"
					pagination={false}
					scroll={{ y: 240 }}
				/>
			</FilterTableContainer>
			<SaveContainer>
				<Button
					className="save-container-button"
					type="default"
					onClick={onToggleModelHandler}
				>
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
