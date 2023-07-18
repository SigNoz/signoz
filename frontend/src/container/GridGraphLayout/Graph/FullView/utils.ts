import { ChartData, ChartDataset } from 'chart.js';
import { LOCALSTORAGE } from 'constants/localStorage';

import { ExtendedChartDataset, LegendEntryProps } from './types';

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
	graphVisibilityStates: boolean[],
	name: string,
): void => {
	const newLegendEntry = {
		name,
		dataIndex: data.datasets.map(
			(item, index): LegendEntryProps => ({
				label: item.label || '',
				show: graphVisibilityStates[index],
			}),
		),
	};

	let existingEntries: { name: string; dataIndex: LegendEntryProps[] }[] = [];

	try {
		existingEntries = JSON.parse(
			localStorage.getItem(LOCALSTORAGE.GRAPH_VISIBILITY_STATES) || '[]',
		);
	} catch (error) {
		console.error('Error parsing LEGEND_GRAPH from local storage', error);
	}

	const entryIndex = existingEntries.findIndex((entry) => entry.name === name);

	if (entryIndex >= 0) {
		existingEntries[entryIndex] = newLegendEntry;
	} else {
		existingEntries = [...existingEntries, newLegendEntry];
	}

	try {
		localStorage.setItem(
			LOCALSTORAGE.GRAPH_VISIBILITY_STATES,
			JSON.stringify(existingEntries),
		);
	} catch (error) {
		console.error('Error setting LEGEND_GRAPH to local storage', error);
	}
};
