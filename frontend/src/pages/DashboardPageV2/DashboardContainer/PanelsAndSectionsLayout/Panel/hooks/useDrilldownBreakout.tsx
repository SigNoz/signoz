import { useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { ArrowLeft } from '@signozhq/icons';
import type { PANEL_TYPES } from 'constants/queryBuilder';
import BreakoutOptions from 'container/QueryTable/Drilldown/BreakoutOptions';
import { getQueryData } from 'container/QueryTable/Drilldown/drilldownUtils';
import {
	getBreakoutPanelType,
	getBreakoutQuery,
} from 'container/QueryTable/Drilldown/tableDrilldownUtils';
import type { BreakoutAttributeType } from 'container/QueryTable/Drilldown/types';
import type { AggregateData } from 'container/QueryTable/Drilldown/useAggregateDrilldown';
import ContextMenu from 'periscope/components/ContextMenu';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';

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
	/** Return to the base aggregate menu — the back arrow. */
	onBack: () => void;
	/** Close the popover after navigating to the View modal. */
	onClose: () => void;
}

export interface UseDrilldownBreakoutApi {
	/** The picker submenu content (back header + attribute list); shown by the parent when the breakout submenu is active. */
	items: ReactNode;
}

/**
 * The "Breakout by .." submenu: pick an attribute, regroup the clicked query by it, and open
 * the result in the View modal. Reuses V1's read-only `BreakoutOptions` picker +
 * `getBreakoutQuery`/`getBreakoutPanelType`; the parent (`useDrilldown`) owns which submenu is open.
 */
export function useDrilldownBreakout({
	panelId,
	v1Query,
	panelType,
	aggregateData,
	openViewWithQuery,
	onBack,
	onClose,
}: UseDrilldownBreakoutArgs): UseDrilldownBreakoutApi {
	const handleBreakoutClick = useCallback(
		(groupBy: BreakoutAttributeType): void => {
			if (!aggregateData) {
				return;
			}
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

	const items = useMemo<ReactNode>(() => {
		if (!aggregateData) {
			return null;
		}
		return (
			<>
				<ContextMenu.Header>
					<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
						<ArrowLeft
							size={14}
							style={{ cursor: 'pointer' }}
							onClick={onBack}
							data-testid="drilldown-breakout-back"
						/>
						<span>Breakout by</span>
					</div>
				</ContextMenu.Header>
				<BreakoutOptions
					queryData={getQueryData(v1Query, aggregateData.queryName)}
					onColumnClick={handleBreakoutClick}
				/>
			</>
		);
	}, [aggregateData, v1Query, onBack, handleBreakoutClick]);

	return { items };
}
