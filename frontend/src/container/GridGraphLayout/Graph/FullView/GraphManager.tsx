import { Button, Input } from 'antd';
import { CheckboxChangeEvent } from 'antd/es/checkbox';
import { ColumnType } from 'antd/es/table';
import { ChartData, ChartDataset } from 'chart.js';
import CheckBox from 'components/Checkbox';
import { ResizeTable } from 'components/ResizeTable';
import { useNotifications } from 'hooks/useNotifications';
import isEqual from 'lodash-es/isEqual';
import { memo, useEffect, useState } from 'react';

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
	graphVisibilityHandler,
	name,
}: GraphManagerProps): JSX.Element {
	const [graphVisibilityArray, setGraphVisibilityArray] = useState<boolean[]>(
		Array(data.datasets.length).fill(true),
	);
	const [tableDataSet, setTableDataSet] = useState<ExtendedChartDataset[]>(
		getDefaultTableDataSet(data),
	);
	const [legendEntries, setLegendEntries] = useState<LegendEntryProps[]>([]);

	const { notifications } = useNotifications();

	useEffect(() => {
		if (graphVisibilityHandler) {
			graphVisibilityHandler([...graphVisibilityArray]);
		}
	}, [graphVisibilityArray, graphVisibilityHandler]);

	useEffect(() => {
		const graphDisplayStatusArray: boolean[] = Array(data.datasets.length).fill(
			true,
		);
		setTableDataSet(getDefaultTableDataSet(data));
		data.datasets.forEach((d, i) => {
			const index = legendEntries.findIndex((di) => di.label === d.label);
			if (index !== -1) {
				graphDisplayStatusArray[i] = legendEntries[index].show;
			}
		});
		setGraphVisibilityArray(graphDisplayStatusArray);
	}, [data, legendEntries]);

	useEffect(() => {
		if (localStorage.getItem('LEGEND_GRAPH') !== null) {
			const legendGraphFromLocalStore = localStorage.getItem('LEGEND_GRAPH');
			const legendFromLocalStore: [
				{ name: string; dataIndex: LegendEntryProps[] },
			] = JSON.parse(legendGraphFromLocalStore as string);
			let isfound = false;
			const graphDisplayStatusArray = Array(data.datasets.length).fill(true);
			legendFromLocalStore.forEach((item) => {
				if (item.name === name) {
					setLegendEntries(item.dataIndex);
					data.datasets.forEach((d, i) => {
						const index = item.dataIndex.findIndex((di) => di.label === d.label);
						if (index !== -1) {
							graphDisplayStatusArray[i] = item.dataIndex[index].show;
						}
					});
					setGraphVisibilityArray(graphDisplayStatusArray);
					isfound = true;
				}
			});
			if (!isfound) {
				setGraphVisibilityArray(Array(data.datasets.length).fill(true));
				setLegendEntries(showAllDataSet(data));
			}
		} else {
			setGraphVisibilityArray(Array(data.datasets.length).fill(true));
			setLegendEntries(showAllDataSet(data));
		}
	}, [data, name]);

	const checkBoxOnChangeHandler = (
		e: CheckboxChangeEvent,
		index: number,
	): void => {
		graphVisibilityArray[index] = e.target.checked;
		setGraphVisibilityArray([...graphVisibilityArray]);
		if (graphVisibilityHandler) {
			graphVisibilityHandler(graphVisibilityArray);
		}
	};

	const getCheckBox = (index: number): React.ReactElement => (
		<CheckBox
			data={data}
			index={index}
			graphVisibilityArray={graphVisibilityArray}
			checkBoxOnChangeHandler={checkBoxOnChangeHandler}
		/>
	);

	const labelClickedHandler = (labelIndex: number): void => {
		const newGraphVisibilityArray = Array(data.datasets.length).fill(false);
		newGraphVisibilityArray[labelIndex] = true;
		setGraphVisibilityArray([...newGraphVisibilityArray]);
		if (graphVisibilityHandler) {
			graphVisibilityHandler(newGraphVisibilityArray);
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
			dataIndex: 'index',
			key: 'index',
			render: (index: number): JSX.Element => getCheckBox(index),
		},
		{
			title: 'Legend',
			width: 300,
			dataIndex: 'label',
			key: 'label',
			render: (label: string, _, index): JSX.Element => getLabel(label, index),
		},
		{
			title: 'Avg',
			width: 70,
			dataIndex: 'avg',
			key: 'avg',
		},
		{
			title: 'Sum',
			width: 70,
			dataIndex: 'sum',
			key: 'sum',
		},
		{
			title: 'Max',
			width: 70,
			dataIndex: 'max',
			key: 'max',
		},
		{
			title: 'Min',
			width: 70,
			dataIndex: 'min',
			key: 'min',
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
		saveLegendEntriesToLocalStorage(data, graphVisibilityArray, name);
		notifications.success({
			message: 'The updated graphs & legends are saved',
		});
		if (graphVisibilityHandler) {
			graphVisibilityHandler(graphVisibilityArray);
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
	graphVisibilityHandler?: (graphVisibilityArray: boolean[]) => void;
	name: string;
}

GraphManager.defaultProps = {
	graphVisibilityHandler: undefined,
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
