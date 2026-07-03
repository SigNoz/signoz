import { useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { getGroupContextMenuConfig } from 'container/QueryTable/Drilldown/contextConfig';
import {
	addFilterToQuery,
	getBaseMeta,
	isNumberDataType,
} from 'container/QueryTable/Drilldown/drilldownUtils';
import type { ClickedData } from 'periscope/components/ContextMenu';
import type { DrilldownContext } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/drilldown';
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
	/** The filter-by-value operator menu for a group-column click; `null` otherwise. */
	items: ReactNode;
}

/**
 * The group-column "filter by value" drill-down (V1 parity): adds `key <op> value` to the
 * panel's query and opens the refined result in the View modal. Reuses V1's read-only
 * `getGroupContextMenuConfig` for the operator menu.
 */
export function useDrilldownFilter({
	context,
	v1Query,
	panelId,
	panelType,
	openViewWithQuery,
	onClose,
}: UseDrilldownFilterArgs): UseDrilldownFilterApi {
	const handleFilterDrilldown = useCallback(
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
			openViewWithQuery(panelId, refinedQuery, panelType);
			onClose();
		},
		[context, v1Query, panelType, panelId, openViewWithQuery, onClose],
	);

	const items = useMemo<ReactNode>(() => {
		if (!context || context.columnKind !== 'group' || !context.clickedKey) {
			return null;
		}
		const clickedData = {
			column: { dataIndex: context.clickedKey, title: context.clickedKey },
			record: {},
		} as unknown as ClickedData;
		return (
			getGroupContextMenuConfig({
				query: v1Query,
				clickedData,
				panelType: PANEL_TYPES.TABLE,
				onColumnClick: handleFilterDrilldown,
			}).items ?? null
		);
	}, [context, v1Query, handleFilterDrilldown]);

	return { items };
}
