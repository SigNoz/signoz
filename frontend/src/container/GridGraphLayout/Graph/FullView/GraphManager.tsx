import { Button, Checkbox, ConfigProvider, Input } from 'antd';
import { CheckboxChangeEvent } from 'antd/es/checkbox';
import { ColumnType } from 'antd/es/table';
import { ChartData, ChartDataset } from 'chart.js';
import { ResizeTable } from 'components/ResizeTable';
import { useNotifications } from 'hooks/useNotifications';
import isEqual from 'lodash-es/isEqual';
import { memo, useEffect, useState } from 'react';

import {
	FilterTableAndSaveContainer,
	FilterTableContainer,
	SaveContainer,
} from './styles';

function GraphManager({
	data,
	graphVisibilityHandler,
	name,
}: MetricGraphTableProps): JSX.Element {
	const [graphVisibilityArray, setGraphVisibilityArray] = useState<boolean[]>(
		Array(data.datasets.length).fill(true),
	);
	const [tableDataSet, setTableDataSet] = useState<ExtendedChartDataset[]>(
		data.datasets.map(
			(item: ChartDataset) =>
				({
					...item,
					show: true,
					sum: parseFloat(
						(item.data as number[]).reduce((a, b) => a + b, 0).toFixed(0),
					),
					avg: parseFloat(
						(
							(item.data as number[]).reduce((a, b) => a + b, 0) / item.data.length
						).toFixed(0),
					),
					max: parseFloat(Math.max(...(item.data as number[])).toFixed(0)),
					min: parseFloat(Math.min(...(item.data as number[])).toFixed(0)),
				} as ExtendedChartDataset),
		),
	);
	const [legendEntries, setLegendEntries] = useState<LegendEntryProps[]>([]);

	const { notifications } = useNotifications();

	const showAllDataSet = (data: ChartData): LegendEntryProps[] =>
		data.datasets.map(
			(item) =>
				({
					label: item.label,
					show: true,
				} as LegendEntryProps),
		);

	useEffect(() => {
		graphVisibilityHandler([...graphVisibilityArray]);
	}, [graphVisibilityArray, graphVisibilityHandler]);

	useEffect(() => {
		const graphDisplayStatusArray: boolean[] = Array(data.datasets.length).fill(
			true,
		);
		setTableDataSet(
			data.datasets.map((item: ChartDataset) => ({
				...item,
				show: true,
				sum: Math.floor((item.data as number[]).reduce((a, b) => a + b, 0)),
				avg: Math.floor(
					(item.data as number[]).reduce((a, b) => a + b, 0) / item.data.length,
				),
				max: Math.floor(Math.max(...(item.data as number[]))),
				min: Math.floor(Math.min(...(item.data as number[]))),
			})),
		);
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
		graphVisibilityHandler(graphVisibilityArray);
	};

	const getCheckBox = (index: number): React.ReactElement => (
		<ConfigProvider
			theme={{
				token: {
					colorPrimary: data.datasets[index].borderColor?.toString(),
					colorBorder: data.datasets[index].borderColor?.toString(),
					colorBgContainer: data.datasets[index].borderColor?.toString(),
				},
			}}
		>
			<Checkbox
				onChange={(e): void => checkBoxOnChangeHandler(e, index)}
				checked={graphVisibilityArray[index]}
			/>
		</ConfigProvider>
	);

	const labelClickedHandler = (labelIndex: number): void => {
		const newGraphVisibilityArray = Array(data.datasets.length).fill(false);
		newGraphVisibilityArray[labelIndex] = true;
		setGraphVisibilityArray([...newGraphVisibilityArray]);
		graphVisibilityHandler(newGraphVisibilityArray);
	};

	const getLabel = (label: string, labelIndex: number): React.ReactElement => {
		let newLebal = label;
		if (label.length > 30) {
			newLebal = `${label.substring(0, 30)}...`;
		}
		return (
			<button
				type="button"
				style={{
					maxWidth: '300px',
					cursor: 'pointer',
					border: 'none',
					backgroundColor: 'transparent',
					color: 'white',
				}}
				onClick={(): void => labelClickedHandler(labelIndex)}
			>
				{newLebal}
			</button>
		);
	};

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
		const legendEntry = {
			name,
			dataIndex: data.datasets.map(
				(item, index) =>
					({
						label: item.label,
						show: graphVisibilityArray[index],
					} as LegendEntryProps),
			),
		};
		if (localStorage.getItem('LEGEND_GRAPH')) {
			const legendEntryData: {
				name: string;
				dataIndex: LegendEntryProps[];
			}[] = JSON.parse(localStorage.getItem('LEGEND_GRAPH') as string);
			const index = legendEntryData.findIndex((val) => val.name === name);
			localStorage.removeItem('LEGEND_GRAPH');
			if (index !== -1) {
				legendEntryData[index] = legendEntry;
			} else {
				legendEntryData.push(legendEntry);
			}
			localStorage.setItem('LEGEND_GRAPH', JSON.stringify(legendEntryData));
		} else {
			const legendEntryArray = [legendEntry];
			localStorage.setItem('LEGEND_GRAPH', JSON.stringify(legendEntryArray));
		}
		notifications.success({
			message: 'Saved successfully!',
		});
		graphVisibilityHandler(graphVisibilityArray);
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
				<Button type="default">Cancel</Button>
				<Button onClick={saveHandler} type="primary">
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

interface MetricGraphTableProps {
	data: ChartData;
	graphVisibilityHandler: (graphVisibilityArray: boolean[]) => void;
	name: string;
}

export interface LegendEntryProps {
	label: string;
	show: boolean;
}

type ExtendedChartDataset = ChartDataset & {
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
