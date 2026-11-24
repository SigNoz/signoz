import getLocalStorageKey from 'api/browser/localstorage/get';
import setLocalStorageKey from 'api/browser/localstorage/set';
import { LOCALSTORAGE } from 'constants/localStorage';
import getLabelName from 'lib/getLabelName';
import { QueryData } from 'types/api/widgets/getQuery';

import {
	LegendEntryProps,
	SaveLegendEntriesToLocalStoreProps,
} from 'container/WidgetCard/Card/FullView/types';

export const showAllDataSetFromApiResponse = (
	apiResponse: QueryData[],
): LegendEntryProps[] =>
	apiResponse.map((item): LegendEntryProps => ({
		label: getLabelName(
			item.metric || {},
			item.queryName || '',
			item.legend || '',
		),
		show: true,
	}));

export const saveLegendEntriesToLocalStorage = ({
	options,
	graphVisibilityState,
	name,
}: SaveLegendEntriesToLocalStoreProps): void => {
	const newLegendEntry = {
		name,
		dataIndex: options.series.map((item, index): LegendEntryProps => ({
			label: item.label || '',
			show: graphVisibilityState[index],
		})),
	};

	let existingEntries: { name: string; dataIndex: LegendEntryProps[] }[] = [];

	try {
		existingEntries = JSON.parse(
			getLocalStorageKey(LOCALSTORAGE.GRAPH_VISIBILITY_STATES) || '[]',
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
		setLocalStorageKey(
			LOCALSTORAGE.GRAPH_VISIBILITY_STATES,
			JSON.stringify(existingEntries),
		);
	} catch (error) {
		console.error('Error setting LEGEND_GRAPH to local storage', error);
	}
};
