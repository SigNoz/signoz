/* eslint-disable sonarjs/cognitive-complexity */
import { LOCALSTORAGE } from 'constants/localStorage';
import { PANEL_TYPES } from 'constants/queryBuilder';
import getLabelName from 'lib/getLabelName';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { QueryData } from 'types/api/widgets/getQuery';

import { LegendEntryProps } from './FullView/types';
import {
	showAllDataSet,
	showAllDataSetFromApiResponse,
} from './FullView/utils';
import {
	GetGraphVisibilityStateOnLegendClickProps,
	GraphVisibilityLegendEntryProps,
	ToggleGraphsVisibilityInChartProps,
} from './types';

export const getLocalStorageGraphVisibilityState = ({
	apiResponse,
	name,
}: {
	apiResponse: QueryData[];
	name: string;
}): GraphVisibilityLegendEntryProps => {
	const visibilityStateAndLegendEntry: GraphVisibilityLegendEntryProps = {
		graphVisibilityStates: Array(apiResponse.length + 1).fill(true),
		legendEntry: [
			{
				label: 'Timestamp',
				show: true,
			},
			...showAllDataSetFromApiResponse(apiResponse),
		],
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

		const newGraphVisibilityStates = Array(apiResponse.length + 1).fill(true);
		legendFromLocalStore.forEach((item) => {
			const newName = name;
			if (item.name === newName) {
				visibilityStateAndLegendEntry.legendEntry = item.dataIndex;
				apiResponse.forEach((datasets, i) => {
					const index = item.dataIndex.findIndex(
						(dataKey) =>
							dataKey.label ===
							getLabelName(datasets.metric, datasets.queryName, datasets.legend || ''),
					);
					if (index !== -1) {
						newGraphVisibilityStates[i + 1] = item.dataIndex[index].show;
					}
				});
				visibilityStateAndLegendEntry.graphVisibilityStates = newGraphVisibilityStates;
			}
		});
	}

	return visibilityStateAndLegendEntry;
};

export const getGraphVisibilityStateOnDataChange = ({
	options,
	isExpandedName,
	name,
}: GetGraphVisibilityStateOnLegendClickProps): GraphVisibilityLegendEntryProps => {
	const visibilityStateAndLegendEntry: GraphVisibilityLegendEntryProps = {
		graphVisibilityStates: Array(options.series.length).fill(true),
		legendEntry: showAllDataSet(options),
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

		const newGraphVisibilityStates = Array(options.series.length).fill(true);
		legendFromLocalStore.forEach((item) => {
			const newName = isExpandedName ? `${name}expanded` : name;
			if (item.name === newName) {
				visibilityStateAndLegendEntry.legendEntry = item.dataIndex;
				options.series.forEach((datasets, i) => {
					if (i !== 0) {
						const index = item.dataIndex.findIndex(
							(dataKey) => dataKey.label === datasets.label,
						);
						if (index !== -1) {
							newGraphVisibilityStates[i] = item.dataIndex[index].show;
						}
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

export const isDataAvailableByPanelType = (
	data?: MetricRangePayloadProps['data'],
	panelType?: string,
): boolean => {
	const getPanelData = (): any[] | undefined => {
		switch (panelType) {
			case PANEL_TYPES.TABLE:
				return (data?.result?.[0] as any)?.table?.rows;
			case PANEL_TYPES.LIST:
				return data?.newResult?.data?.result?.[0]?.list as any[];
			default:
				return data?.result;
		}
	};

	return Boolean(getPanelData()?.length);
};
