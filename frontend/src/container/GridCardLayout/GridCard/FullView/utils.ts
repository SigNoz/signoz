import { ChartData, ChartDataset } from 'chart.js';
import { LOCALSTORAGE } from 'constants/localStorage';

import {
	ExtendedChartDataset,
	LegendEntryProps,
	SaveLegendEntriesToLocalStoreProps,
} from './types';

function convertToTwoDecimalsOrZero(value: number): number {
	if (
		typeof value === 'number' &&
		!Number.isNaN(value) &&
		value !== Infinity &&
		value !== -Infinity
	) {
		const result = value ? value.toFixed(20).match(/^-?\d*\.?0*\d{0,2}/) : null;
		return result ? parseFloat(result[0]) : 0;
	}
	return 0;
}

export const getDefaultTableDataSet = (
	data: ChartData,
): ExtendedChartDataset[] =>
	data.datasets.map(
		(item: ChartDataset): ExtendedChartDataset => {
			if (item.data.length === 0) {
				return {
					...item,
					show: true,
					sum: 0,
					avg: 0,
					max: 0,
					min: 0,
				};
			}
			return {
				...item,
				show: true,
				sum: convertToTwoDecimalsOrZero(
					(item.data as number[]).reduce((a, b) => a + b, 0),
				),
				avg: convertToTwoDecimalsOrZero(
					(item.data as number[]).reduce((a, b) => a + b, 0) / item.data.length,
				),
				max: convertToTwoDecimalsOrZero(Math.max(...(item.data as number[]))),
				min: convertToTwoDecimalsOrZero(Math.min(...(item.data as number[]))),
			};
		},
	);

export const getAbbreviatedLabel = (label: string): string => {
	let newLabel = label;
	if (label.length > 30) {
		newLabel = `${label.substring(0, 30)}...`;
	}
	return newLabel;
};

export const showAllDataSet = (data: ChartData): LegendEntryProps[] =>
	data.datasets.map(
		(item): LegendEntryProps => ({
			label: item.label || '',
			show: true,
		}),
	);

export const saveLegendEntriesToLocalStorage = ({
	data,
	graphVisibilityState,
	name,
}: SaveLegendEntriesToLocalStoreProps): void => {
	const newLegendEntry = {
		name,
		dataIndex: data.datasets.map(
			(item, index): LegendEntryProps => ({
				label: item.label || '',
				show: graphVisibilityState[index],
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

export const getGraphManagerTableHeaderTitle = (
	title: string,
	yAxisUnit?: string,
): string => {
	const yAxisUnitText = yAxisUnit ? `(in ${yAxisUnit})` : '';
	return `${title} ${yAxisUnitText}`;
};
