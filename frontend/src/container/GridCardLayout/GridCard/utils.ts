import { LOCALSTORAGE } from 'constants/localStorage';

import { LegendEntryProps } from './FullView/types';
import { showAllDataSet } from './FullView/utils';
import {
	GetGraphVisibilityStateOnLegendClickProps,
	GraphVisibilityLegendEntryProps,
	ToggleGraphsVisibilityInChartProps,
} from './types';

export const getGraphVisibilityStateOnDataChange = ({
	data,
	isExpandedName,
	name,
}: GetGraphVisibilityStateOnLegendClickProps): GraphVisibilityLegendEntryProps => {
	const visibilityStateAndLegendEntry: GraphVisibilityLegendEntryProps = {
		graphVisibilityStates: Array(data.datasets.length).fill(true),
		legendEntry: showAllDataSet(data),
	};
	if (localStorage.getItem(LOCALSTORAGE.GRAPH_VISIBILITY_STATES) !== null) {
		const legendGraphFromLocalStore = localStorage.getItem(
			LOCALSTORAGE.GRAPH_VISIBILITY_STATES,
		);
		let legendFromLocalStore: {
			name: string;
			dataIndex: LegendEntryProps[];
		}[] = [];

		try {
			legendFromLocalStore = JSON.parse(legendGraphFromLocalStore || '[]');
		} catch (error) {
			console.error(
				'Error parsing GRAPH_VISIBILITY_STATES from local storage',
				error,
			);
		}

		const newGraphVisibilityStates = Array(data.datasets.length).fill(true);
		legendFromLocalStore.forEach((item) => {
			const newName = isExpandedName ? `${name}expanded` : name;
			if (item.name === newName) {
				visibilityStateAndLegendEntry.legendEntry = item.dataIndex;
				data.datasets.forEach((datasets, i) => {
					const index = item.dataIndex.findIndex(
						(dataKey) => dataKey.label === datasets.label,
					);
					if (index !== -1) {
						newGraphVisibilityStates[i] = item.dataIndex[index].show;
					}
				});
				visibilityStateAndLegendEntry.graphVisibilityStates = newGraphVisibilityStates;
			}
		});
	}

	return visibilityStateAndLegendEntry;
};

export const toggleGraphsVisibilityInChart = ({
	graphsVisibilityStates,
	lineChartRef,
}: ToggleGraphsVisibilityInChartProps): void => {
	graphsVisibilityStates?.forEach((showLegendData, index) => {
		lineChartRef?.current?.toggleGraph(index, showLegendData);
	});
};
