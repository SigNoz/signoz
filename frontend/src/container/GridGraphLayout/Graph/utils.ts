import { ChartData } from 'chart.js';
import { LOCALSTORAGE } from 'constants/localStorage';

import { LegendEntryProps } from './FullView/types';
import { showAllDataSet } from './FullView/utils';
import { GraphVisibilityLegendEntryProps } from './types';

export const getGraphVisiblityStateOnDataChange = (
	data: ChartData,
	isExpandedName: boolean,
	name: string,
): GraphVisibilityLegendEntryProps => {
	const visibilityStateAndLegendEntry: GraphVisibilityLegendEntryProps = {
		graphVisibilityStates: Array(data.datasets.length).fill(true),
		legendEntry: showAllDataSet(data),
	};
	if (localStorage.getItem(LOCALSTORAGE.GRAPH_VISIBILITY_STATES) !== null) {
		const legendGraphFromLocalStore = localStorage.getItem(
			LOCALSTORAGE.GRAPH_VISIBILITY_STATES,
		);
		const legendFromLocalStore: [
			{ name: string; dataIndex: LegendEntryProps[] },
		] = JSON.parse(legendGraphFromLocalStore as string);
		// let isfound = false;
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
				// setGraphsVisilityStates(newGraphVisibilityStates);
				visibilityStateAndLegendEntry.graphVisibilityStates = newGraphVisibilityStates;
				// isfound = true;
			}
		});
		// // if legend is not found in local storage then set all graphs to true
		// if (!isfound) {
		// 	setGraphsVisilityStates(Array(data.datasets.length).fill(true));
		// }
	}
	// else {
	// 	setGraphsVisilityStates(Array(data.datasets.length).fill(true));
	// }

	return visibilityStateAndLegendEntry;
};
