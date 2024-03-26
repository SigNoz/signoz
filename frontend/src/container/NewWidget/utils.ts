import { omitIdFromQuery } from 'components/ExplorerCard/utils';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { isEqual } from 'lodash-es';
import { IBuilderQuery, Query } from 'types/api/queryBuilder/queryBuilderData';

export const getIsQueryModified = (
	currentQuery: Query,
	stagedQuery: Query | null,
): boolean => {
	if (!stagedQuery) {
		return false;
	}
	const omitIdFromStageQuery = omitIdFromQuery(stagedQuery);
	const omitIdFromCurrentQuery = omitIdFromQuery(currentQuery);
	return !isEqual(omitIdFromStageQuery, omitIdFromCurrentQuery);
};

interface HandleQueryChangesForGraphTypeChangeProps {
	oldGraphType: PANEL_TYPES;
	newGraphType: PANEL_TYPES;
	params: URLSearchParams;
	currentQuery: Query;
	handleSetQueryData: (index: number, queryData: IBuilderQuery) => void;
}

/**
 *
 * @param oldGraphType: the current graph type of the dashboard widget
 * @param newGraphType: the new graph type selected by the user
 * @param params: the URLSearchParams object
 * @returns void
 * @description This function is used to handle the query changes when the user changes the graph type of the dashboard widget.
 */

export const handleQueryChangesForGraphTypeChange = ({
	oldGraphType,
	newGraphType,
	params,
	currentQuery,
	handleSetQueryData,
}: HandleQueryChangesForGraphTypeChangeProps): void => {
	console.log(
		oldGraphType,
		newGraphType,
		params,
		currentQuery,
		handleSetQueryData,
	);
	// update the query in the params here so that parent can update the URL

	if (oldGraphType === PANEL_TYPES.TIME_SERIES) {
		if (newGraphType === PANEL_TYPES.VALUE) {
			/**  for time series to value type we cannot have group by operator as it will
			 * result in multiple values hence removing them from the current query
			 * */
			currentQuery.builder.queryData.forEach((queryData, index) => {
				handleSetQueryData(index, { ...queryData, groupBy: [] });
			});
		}
		if (newGraphType === PANEL_TYPES.BAR) {
			// this needs to be discussed TODO
		}
		if (newGraphType === PANEL_TYPES.LIST) {
			// this needs to be discussed TODO
		}
	}
};
