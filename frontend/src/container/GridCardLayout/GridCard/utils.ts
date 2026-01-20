/* eslint-disable sonarjs/cognitive-complexity */
import { NotificationInstance } from 'antd/es/notification/interface';
import { NavigateToExplorerProps } from 'components/CeleryTask/useNavigateToExplorer';
import { LOCALSTORAGE } from 'constants/localStorage';
import { PANEL_TYPES } from 'constants/queryBuilder';
import getLabelName from 'lib/getLabelName';
import { Widgets } from 'types/api/dashboard/getAll';
import APIError from 'types/api/error';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { QueryData } from 'types/api/widgets/getQuery';
import { DataSource } from 'types/common/queryBuilder';

import { GraphClickProps } from '../useGraphClickToShowButton';
import { NavigateToExplorerPagesProps } from '../useNavigateToExplorerPages';
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
		graphVisibilityStates: Array(
			(Array.isArray(apiResponse) ? apiResponse.length : 0) + 1,
		).fill(true),
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

interface HandleGraphClickParams {
	xValue: number;
	yValue: number;
	mouseX: number;
	mouseY: number;
	metric?: { [key: string]: string };
	queryData?: { queryName: string; inFocusOrNot: boolean };
	widget: Widgets;
	navigateToExplorerPages: (
		props: NavigateToExplorerPagesProps,
	) => Promise<{
		[queryName: string]: {
			filters: TagFilterItem[];
			dataSource?: string;
		};
	}>;
	navigateToExplorer: (props: NavigateToExplorerProps) => void;
	notifications: NotificationInstance;
	graphClick: (props: GraphClickProps) => void;
	customFilters?: TagFilterItem[];
	customTracesTimeRange?: { start: number; end: number };
}

export const handleGraphClick = async ({
	xValue,
	yValue,
	mouseX,
	mouseY,
	metric,
	queryData,
	widget,
	navigateToExplorerPages,
	navigateToExplorer,
	notifications,
	graphClick,
	customFilters,
	customTracesTimeRange,
}: HandleGraphClickParams): Promise<void> => {
	const { stepInterval } = widget?.query?.builder?.queryData?.[0] ?? {};

	try {
		const result = await navigateToExplorerPages({
			widget,
			requestData: {
				...metric,
				queryName: queryData?.queryName || '',
				inFocusOrNot: queryData?.inFocusOrNot || false,
			},
		});

		const keys = Object.keys(result);
		const menuItems = keys.map((key) => ({
			text:
				keys.length === 1
					? `View ${
							(result[key].dataSource as DataSource) === DataSource.TRACES
								? 'Traces'
								: 'Logs'
					  }`
					: `View ${
							(result[key].dataSource as DataSource) === DataSource.TRACES
								? 'Traces'
								: 'Logs'
					  }: ${key}`,
			onClick: (): void =>
				navigateToExplorer({
					filters: [...result[key].filters, ...(customFilters || [])],
					dataSource: result[key].dataSource as DataSource,
					startTime: customTracesTimeRange ? customTracesTimeRange?.start : xValue,
					endTime: customTracesTimeRange
						? customTracesTimeRange?.end
						: xValue + (stepInterval ?? 60),
					shouldResolveQuery: true,
					widgetQuery: widget?.query,
				}),
		}));

		graphClick({ xValue, yValue, mouseX, mouseY, metric, queryData, menuItems });
	} catch (error) {
		notifications.error({
			message: 'Failed to process graph click',
			description:
				error instanceof Error ? error.message : 'Unknown error occurred',
		});
	}
};

export const errorDetails = (error: APIError): string => {
	const { message, errors } = error.getErrorDetails()?.error || {};

	const details =
		errors?.length > 0
			? `\n\nDetails: ${errors.map((e) => e.message).join('\n')}`
			: '';
	const errorDetails = `${message} ${details}`;
	return errorDetails || 'Unknown error occurred';
};
