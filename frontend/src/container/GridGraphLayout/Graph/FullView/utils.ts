import { ChartData, ChartDataset } from 'chart.js';

import { ExtendedChartDataset, LegendEntryProps } from './GraphManager';

export const getDefaultTableDataSet = (
	data: ChartData,
): ExtendedChartDataset[] =>
	data.datasets.map(
		(item: ChartDataset): ExtendedChartDataset => ({
			...item,
			show: true,
			sum: Math.floor((item.data as number[]).reduce((a, b) => a + b, 0)),
			avg: Math.floor(
				(item.data as number[]).reduce((a, b) => a + b, 0) / item.data.length,
			),
			max: Math.floor(Math.max(...(item.data as number[]))),
			min: Math.floor(Math.min(...(item.data as number[]))),
		}),
	);

export const getAbbreviatedLabel = (label: string): string => {
	let newLebal = label;
	if (label.length > 30) {
		newLebal = `${label.substring(0, 30)}...`;
	}
	return newLebal;
};

export const showAllDataSet = (data: ChartData): LegendEntryProps[] =>
	data.datasets.map(
		(item): LegendEntryProps => ({
			label: item.label || '',
			show: true,
		}),
	);

export const saveLegendEntriesToLocalStorage = (
	data: ChartData,
	graphVisibilityArray: boolean[],
	name: string,
): void => {
	const legendEntry = {
		name,
		dataIndex: data.datasets.map(
			(item, index): LegendEntryProps => ({
				label: item.label || '',
				show: graphVisibilityArray[index],
			}),
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
};
