import { useCallback } from 'react';
import logEvent from 'api/common/logEvent';
import { PANEL_TYPES } from 'constants/queryBuilder';
import {
	addFilterToQuery,
	getBaseMeta,
	isNumberDataType,
} from 'container/QueryTable/Drilldown/drilldownUtils';
import type { DrilldownContext } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/drilldown';
import { DashboardDetailEvents } from 'pages/DashboardPageV2/constants/events';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';

interface UseDrilldownFilterArgs {
	/** The clicked point's context; the filter menu only appears for a group-column click. */
	context: DrilldownContext | null;
	/** The panel's V5→V1 query the filter is added to. */
	v1Query: Query;
	panelId: string;
	/** Panel's V1 type — the kind the refined query opens the View modal as. */
	panelType: PANEL_TYPES;
	/** Opens the View modal on the refined query, persisting it in the URL. */
	openViewWithQuery: (
		panelId: string,
		query: Query,
		panelType: PANEL_TYPES,
	) => void;
	/** Close the popover after opening the View modal. */
	onClose: () => void;
}

export interface UseDrilldownFilterApi {
	/** True for a group-column click — the caller renders the filter-by-value menu. */
	isGroupColumnClick: boolean;
	/** Apply the chosen operator: add `key <op> value` and open the refined result in the View modal. */
	onFilter: (operator: string) => void;
}

/**
 * The group-column "filter by value" drill-down (V1 parity): adds `key <op> value` to the panel's
 * query and opens the refined result in the View modal. The caller renders `DrilldownFilterMenu`
 * (V1's read-only `getGroupContextMenuConfig`) from this hook's return.
 */
export function useDrilldownFilter({
	context,
	v1Query,
	panelId,
	panelType,
	openViewWithQuery,
	onClose,
}: UseDrilldownFilterArgs): UseDrilldownFilterApi {
	const onFilter = useCallback(
		(operator: string): void => {
			if (!context?.clickedKey) {
				return;
			}
			let filterValue: string | number = context.clickedValue ?? '';
			const baseMeta = getBaseMeta(v1Query, context.clickedKey);
			if (baseMeta && isNumberDataType(baseMeta.dataType) && filterValue !== '') {
				filterValue = Number(filterValue);
			}
			const refinedQuery = addFilterToQuery(v1Query, [
				{ filterKey: context.clickedKey, filterValue, operator },
			]);
			void logEvent(DashboardDetailEvents.DrilldownAction, {
				action: 'filterByValue',
				panelType,
			});
			openViewWithQuery(panelId, refinedQuery, panelType);
			onClose();
		},
		[context, v1Query, panelType, panelId, openViewWithQuery, onClose],
	);

	const isGroupColumnClick =
		!!context && context.columnKind === 'group' && !!context.clickedKey;

	return { isGroupColumnClick, onFilter };
}
