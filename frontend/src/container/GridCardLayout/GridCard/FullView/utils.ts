import { LOCALSTORAGE } from 'constants/localStorage';
import uPlot from 'uplot';

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
	options: uPlot.Options,
	data: uPlot.AlignedData,
): ExtendedChartDataset[] =>
	options.series.map(
		(item: uPlot.Series, index: number): ExtendedChartDataset => ({
			...item,
			index,
			show: true,
			sum: convertToTwoDecimalsOrZero(
				(data[index] as number[]).reduce((a, b) => a + b, 0),
			),
			avg: convertToTwoDecimalsOrZero(
				(data[index] as number[]).reduce((a, b) => a + b, 0) / data[index].length,
			),
			max: convertToTwoDecimalsOrZero(Math.max(...(data[index] as number[]))),
			min: convertToTwoDecimalsOrZero(Math.min(...(data[index] as number[]))),
		}),
	);

export const getAbbreviatedLabel = (label: string): string => {
	let newLabel = label;
	if (label.length > 30) {
		newLabel = `${label.substring(0, 30)}...`;
	}
	return newLabel;
};

export const showAllDataSet = (options: uPlot.Options): LegendEntryProps[] =>
	options.series
		.map(
			(item): LegendEntryProps => ({
				label: item.label || '',
				show: true,
			}),
		)
		.filter((_, index) => index !== 0);

export const saveLegendEntriesToLocalStorage = ({
	options,
	graphVisibilityState,
	name,
}: SaveLegendEntriesToLocalStoreProps): void => {
	const newLegendEntry = {
		name,
		dataIndex: options.series.map(
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
