import { Button, Checkbox, ConfigProvider, Input } from 'antd';
import { CheckboxChangeEvent } from 'antd/es/checkbox';
import { ColumnType } from 'antd/es/table';
import { ChartData, ChartDataset } from 'chart.js';
import { ResizeTable } from 'components/ResizeTable';
import isEqual from 'lodash-es/isEqual';
import { memo, useEffect, useState } from 'react';

import {
	FilterTableAndSaveContainer,
	FilterTableContainer,
	SaveContainer,
} from './styles';

function MetricGraphTable({
	data,
	showDataIndexHandler,
	name,
}: MetricGraphTableProps): JSX.Element {
	const [displayGraph, setDisplayGraph] = useState<boolean[]>(
		Array(data.datasets.length).fill(true),
	);
	const [dataSet, setDataSet] = useState<IndexSelectedProps[]>(
		data.datasets.map(
			(item: ChartDataset) =>
				({
					...item,
					show: true,
					sum: (item.data as number[]).reduce((a, b) => a + b, 0),
					avg: (item.data as number[]).reduce((a, b) => a + b, 0) / item.data.length,
					max: Math.max(...(item.data as number[])),
					min: Math.min(...(item.data as number[])),
				} as IndexSelectedProps),
		),
	);
	const [labelAndDisplayData, setLabelAndDisplayData] = useState<
		ShowLegendProps[]
	>([]);

	const showAllDataSet = (data: ChartData): ShowLegendProps[] =>
		data.datasets.map(
			(item) =>
				({
					label: item.label,
					show: true,
				} as ShowLegendProps),
		);

	useEffect(() => {
		showDataIndexHandler([...displayGraph]);
	}, [displayGraph, showDataIndexHandler]);

	const [chartDataSet, setChartDataSet] = useState<ChartData>(data);
	console.log(
		'🚀 ~ file: MetricGraphTable.tsx:34 ~ chartDataSet:',
		chartDataSet,
	);

	useEffect(() => {
		const sequenceArray: boolean[] = Array(data.datasets.length).fill(true);
		setDataSet(
			data.datasets.map((item: ChartDataset) => ({
				...item,
				show: true,
				sum: (item.data as number[]).reduce((a, b) => a + b, 0),
				avg: (item.data as number[]).reduce((a, b) => a + b, 0) / item.data.length,
				max: Math.max(...(item.data as number[])),
				min: Math.min(...(item.data as number[])),
			})),
		);
		data.datasets.forEach((d, i) => {
			const index = labelAndDisplayData.findIndex((di) => di.label === d.label);
			if (index !== -1) {
				sequenceArray[i] = labelAndDisplayData[index].show;
			}
		});
		setChartDataSet(data);
		setDisplayGraph(sequenceArray);
	}, [data, labelAndDisplayData]);

	useEffect(() => {
		if (localStorage.getItem('LEGEND_GRAPH') !== null) {
			const legendGraphFromLocalStore = localStorage.getItem('LEGEND_GRAPH');
			const legendFromLocalStore: [
				{ name: string; dataIndex: ShowLegendProps[] },
			] = JSON.parse(legendGraphFromLocalStore as string);
			let isfound = false;
			const sequenceArray = Array(data.datasets.length).fill(true);
			legendFromLocalStore.forEach((item) => {
				if (item.name === name) {
					setLabelAndDisplayData(item.dataIndex);
					data.datasets.forEach((d, i) => {
						const index = item.dataIndex.findIndex((di) => di.label === d.label);
						if (index !== -1) {
							sequenceArray[i] = item.dataIndex[index].show;
						}
					});
					setDisplayGraph(sequenceArray);
					isfound = true;
				}
			});
			if (!isfound) {
				setDisplayGraph(Array(data.datasets.length).fill(true));
				setLabelAndDisplayData(showAllDataSet(data));
			}
		} else {
			setDisplayGraph(Array(data.datasets.length).fill(true));
			setLabelAndDisplayData(showAllDataSet(data));
		}
	}, [data, name]);

	useEffect((): void => {
		setChartDataSet((prevState) => {
			const newChartDataSet: ChartData = { ...prevState };
			newChartDataSet.datasets = dataSet.filter((item) => item.hidden);
			return newChartDataSet;
		});
	}, [dataSet, setChartDataSet]);

	const checkBoxOnChangeHandler = (
		e: CheckboxChangeEvent,
		index: number,
	): void => {
		displayGraph[index] = e.target.checked;
		setDisplayGraph([...displayGraph]);
		showDataIndexHandler(displayGraph);
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
				checked={displayGraph[index]}
			/>
		</ConfigProvider>
	);

	const getLabel = (label: string): React.ReactElement => {
		if (label.length > 30) {
			const newLebal = `${label.substring(0, 30)}...`;
			return <span style={{ maxWidth: '300px' }}>{newLebal}</span>;
		}
		return <span style={{ maxWidth: '300px' }}>{label}</span>;
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
			render: (label: string): JSX.Element => getLabel(label),
		},
		{
			title: 'Avg',
			width: 10,
			dataIndex: 'avg',
			key: 'avg',
		},
		{
			title: 'Sum',
			width: 10,
			dataIndex: 'sum',
			key: 'sum',
		},
		{
			title: 'Max',
			width: 10,
			dataIndex: 'max',
			key: 'max',
		},
		{
			title: 'Min',
			width: 10,
			dataIndex: 'min',
			key: 'min',
		},
	];

	const filterHandler = (event: React.ChangeEvent<HTMLInputElement>): void => {
		const value = event.target.value.toString().toLowerCase();
		const updatedDataSet = dataSet.map((item) => {
			if (item.label?.toLocaleLowerCase().includes(value)) {
				return { ...item, show: true };
			}
			return { ...item, show: false };
		});
		setDataSet(updatedDataSet);
		chartDataSet.datasets = dataSet;
		setChartDataSet({ ...chartDataSet });
	};

	const saveHandler = (): void => {
		const newLegendData = {
			name,
			dataIndex: data.datasets.map(
				(item, index) =>
					({
						label: item.label,
						show: displayGraph[index],
					} as ShowLegendProps),
			),
		};
		if (localStorage.getItem('LEGEND_GRAPH')) {
			const legendData: {
				name: string;
				dataIndex: ShowLegendProps[];
			}[] = JSON.parse(localStorage.getItem('LEGEND_GRAPH') as string);
			const legendIndex = legendData.findIndex((val) => val.name === name);
			localStorage.removeItem('LEGEND_GRAPH');
			if (legendIndex !== -1) {
				legendData[legendIndex] = newLegendData;
			} else {
				legendData.push(newLegendData);
			}
			localStorage.setItem('LEGEND_GRAPH', JSON.stringify(legendData));
		} else {
			const legendArray = [newLegendData];
			localStorage.setItem('LEGEND_GRAPH', JSON.stringify(legendArray));
		}
	};

	return (
		<FilterTableAndSaveContainer>
			<FilterTableContainer>
				<Input onChange={filterHandler} placeholder="Filter Series" />
				<ResizeTable
					columns={columns}
					dataSource={dataSet.filter((item) => item.show)}
					rowKey="index"
					pagination={false}
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
	showDataIndexHandler: (showLegendArray: boolean[]) => void;
	name: string;
}

export interface ShowLegendProps {
	label: string;
	show: boolean;
}

type IndexSelectedProps = ChartDataset & {
	show: boolean;
	sum: number;
	avg: number;
	min: number;
	max: number;
};

export default memo(
	MetricGraphTable,
	(prevProps, nextProps) =>
		isEqual(prevProps.data, nextProps.data) && prevProps.name === nextProps.name,
);
