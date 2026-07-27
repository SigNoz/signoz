import { useCallback, useMemo } from 'react';
import logEvent from 'api/common/logEvent';
import type { PANEL_TYPES } from 'constants/queryBuilder';
import { getQueryData } from 'container/QueryTable/Drilldown/drilldownUtils';
import {
	getBreakoutPanelType,
	getBreakoutQuery,
} from 'container/QueryTable/Drilldown/tableDrilldownUtils';
import type { BreakoutAttributeType } from 'container/QueryTable/Drilldown/types';
import type { AggregateData } from 'container/QueryTable/Drilldown/useAggregateDrilldown';
import { DashboardDetailEvents } from 'pages/DashboardPageV2/constants/events';
import type {
	IBuilderQuery,
	Query,
} from 'types/api/queryBuilder/queryBuilderData';

interface UseDrilldownBreakoutArgs {
	panelId: string;
	/** The panel's V5→V1 query; the breakout regroups the clicked query within it. */
	v1Query: Query;
	/** The panel's current V1 panel type — drives the breakout target type. */
	panelType: PANEL_TYPES;
	aggregateData: AggregateData | null;
	/** Opens the View modal on the breakout query (at the breakout's target kind), persisting it in the URL. */
	openViewWithQuery: (
		panelId: string,
		query: Query,
		panelType: PANEL_TYPES,
	) => void;
	/** Close the popover after navigating to the View modal. */
	onClose: () => void;
}

export interface UseDrilldownBreakoutApi {
	/** The clicked query's builder data for the attribute picker; `undefined` when there's no aggregate to break out. */
	queryData: IBuilderQuery | undefined;
	/** Regroup the clicked query by the picked attribute and open the result in the View modal. */
	onBreakout: (groupBy: BreakoutAttributeType) => void;
}

/**
 * The "Breakout by .." submenu logic: regroup the clicked query by a picked attribute and open the
 * result in the View modal. Reuses V1's read-only `getBreakoutQuery`/`getBreakoutPanelType`; the
 * caller renders `DrilldownBreakoutMenu` (V1's `BreakoutOptions` picker) from this hook's return.
 */
export function useDrilldownBreakout({
	panelId,
	v1Query,
	panelType,
	aggregateData,
	openViewWithQuery,
	onClose,
}: UseDrilldownBreakoutArgs): UseDrilldownBreakoutApi {
	const onBreakout = useCallback(
		(groupBy: BreakoutAttributeType): void => {
			if (!aggregateData) {
				return;
			}
			void logEvent(DashboardDetailEvents.DrilldownAction, {
				action: 'breakout',
				panelType,
			});
			const breakoutQuery = getBreakoutQuery(
				v1Query,
				aggregateData,
				groupBy,
				aggregateData.filters ?? [],
			);
			openViewWithQuery(panelId, breakoutQuery, getBreakoutPanelType(panelType));
			onClose();
		},
		[aggregateData, v1Query, panelType, panelId, openViewWithQuery, onClose],
	);

	const queryData = useMemo(
		() =>
			aggregateData ? getQueryData(v1Query, aggregateData.queryName) : undefined,
		[aggregateData, v1Query],
	);

	return { queryData, onBreakout };
}
