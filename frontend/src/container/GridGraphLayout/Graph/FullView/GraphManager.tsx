import { Button, Input } from 'antd';
import { CheckboxChangeEvent } from 'antd/es/checkbox';
import { ColumnType } from 'antd/es/table';
import { ChartData, ChartDataset } from 'chart.js';
import { ResizeTable } from 'components/ResizeTable';
import { LOCALSTORAGE } from 'constants/localStorage';
import { useNotifications } from 'hooks/useNotifications';
import isEqual from 'lodash-es/isEqual';
import { memo, useEffect, useState } from 'react';

import CheckBox from './CheckBox';
import { ColumnsTitle, DataIndexAndKey } from './contants';
import {
	FilterTableAndSaveContainer,
	FilterTableContainer,
	LabelContainer,
	SaveContainer,
} from './styles';
import {
	getAbbreviatedLabel,
	getDefaultTableDataSet,
	saveLegendEntriesToLocalStorage,
	showAllDataSet,
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
		data.datasets.forEach((d, i) => {
			const index = legendEntries.findIndex((di) => di.label === d.label);
			if (index !== -1) {
				newGraphVisibilityStates[i] = legendEntries[index].show;
			}
		});
		setGraphVisibilityState(newGraphVisibilityStates);
	}, [data, legendEntries]);

	useEffect(() => {
		if (localStorage.getItem(LOCALSTORAGE.GRAPH_VISIBILITY_STATES) !== null) {
			const legendGraphFromLocalStore = localStorage.getItem(
				LOCALSTORAGE.GRAPH_VISIBILITY_STATES,
			);
			const legendFromLocalStore: [
				{ name: string; dataIndex: LegendEntryProps[] },
			] = JSON.parse(legendGraphFromLocalStore || '[]');
			let isfound = false;
			const newGraphVisibilityStates = Array(data.datasets.length).fill(true);
			legendFromLocalStore.forEach((item) => {
				// if the legend entries are found in the local storage
				if (item.name === name) {
					setLegendEntries(item.dataIndex);
					data.datasets.forEach((dataset, i) => {
						const index = item.dataIndex.findIndex(
							(dataKey) => dataKey.label === dataset.label,
						);
						if (index !== -1) {
							newGraphVisibilityStates[i] = item.dataIndex[index].show;
						}
					});
					setGraphVisibilityState(newGraphVisibilityStates);
					isfound = true;
				}
			});
			// if the legend entries are not found in the local storage
			if (!isfound) {
				setGraphVisibilityState(Array(data.datasets.length).fill(true));
				setLegendEntries(showAllDataSet(data));
			}
		} else {
			// if the legend entries are not found in the local storage
			setGraphVisibilityState(Array(data.datasets.length).fill(true));
			setLegendEntries(showAllDataSet(data));
		}
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
		<CheckBox
			data={data}
			index={index}
			graphVisibilityState={graphVisibilityState}
			checkBoxOnChangeHandler={checkBoxOnChangeHandler}
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
		<LabelContainer
			type="button"
			onClick={(): void => labelClickedHandler(labelIndex)}
		>
			{getAbbreviatedLabel(label)}
		</LabelContainer>
	);

	const columns: ColumnType<DataSetProps>[] = [
		{
			title: '',
			width: 50,
			dataIndex: DataIndexAndKey.Index,
			key: DataIndexAndKey.Index,
			render: (index: number): JSX.Element => getCheckBox(index),
		},
		{
			title: ColumnsTitle.Legend,
			width: 300,
			dataIndex: DataIndexAndKey.Label,
			key: DataIndexAndKey.Label,
			render: (label: string, _, index): JSX.Element => getLabel(label, index),
		},
		{
			title: ColumnsTitle.Avg,
			width: 70,
			dataIndex: DataIndexAndKey.Avg,
			key: DataIndexAndKey.Avg,
		},
		{
			title: ColumnsTitle.Sum,
			width: 70,
			dataIndex: DataIndexAndKey.Sum,
			key: DataIndexAndKey.Sum,
		},
		{
			title: ColumnsTitle.Max,
			width: 70,
			dataIndex: DataIndexAndKey.Max,
			key: DataIndexAndKey.Max,
		},
		{
			title: ColumnsTitle.Min,
			width: 70,
			dataIndex: DataIndexAndKey.Min,
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

interface DataSetProps {
	index: number;
	data: number | null;
	label: string;
	borderWidth: number;
	spanGaps: boolean;
	animations: boolean;
	borderColor: string;
	showLine: boolean;
	pointRadius: number;
}

interface GraphManagerProps {
	data: ChartData;
	graphVisibilityStateHandler?: (graphVisibilityArray: boolean[]) => void;
	name: string;
}

GraphManager.defaultProps = {
	graphVisibilityStateHandler: undefined,
};

export interface LegendEntryProps {
	label: string;
	show: boolean;
}

export type ExtendedChartDataset = ChartDataset & {
	show: boolean;
	sum: number;
	avg: number;
	min: number;
	max: number;
};

export default memo(
	GraphManager,
	(prevProps, nextProps) =>
		isEqual(prevProps.data, nextProps.data) && prevProps.name === nextProps.name,
);
