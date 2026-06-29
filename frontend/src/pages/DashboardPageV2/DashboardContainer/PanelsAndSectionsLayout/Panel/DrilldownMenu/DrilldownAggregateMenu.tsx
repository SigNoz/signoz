import { useMemo } from 'react';
import { ChartBar, DraftingCompass, ScrollText } from '@signozhq/icons';
import { getAggregateColumnHeader } from 'container/QueryTable/Drilldown/drilldownUtils';
import ContextMenu from 'periscope/components/ContextMenu';
import type { DrilldownContext } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/drilldown';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';

interface DrilldownAggregateMenuProps {
	context: DrilldownContext;
	/** Panel's V5→V1 query — supplies the aggregation-expression header fallback. */
	query: Query;
	onViewLogs: () => void;
	onViewTraces: () => void;
	onBreakout: () => void;
}

/**
 * The base aggregate drill-down menu: a tinted header + View in Logs/Traces + Breakout.
 * Metrics is omitted — V1 surfaces only Logs/Traces.
 */
function DrilldownAggregateMenu({
	context,
	query,
	onViewLogs,
	onViewTraces,
	onBreakout,
}: DrilldownAggregateMenuProps): JSX.Element {
	const aggregations = useMemo(
		() => getAggregateColumnHeader(query, context.queryName).aggregations,
		[query, context.queryName],
	);

	return (
		<>
			<ContextMenu.Header>
				<div style={{ textTransform: 'capitalize' }}>{context.signal}</div>
				<div
					style={{
						fontWeight: 'normal',
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						whiteSpace: 'nowrap',
						color: context.seriesColor,
					}}
				>
					{context.label || aggregations}
				</div>
			</ContextMenu.Header>
			<ContextMenu.Item
				icon={
					<span style={{ color: context.seriesColor }}>
						<ScrollText size={16} />
					</span>
				}
				onClick={onViewLogs}
			>
				<span data-testid="drilldown-view-logs">View in Logs</span>
			</ContextMenu.Item>
			<ContextMenu.Item
				icon={
					<span style={{ color: context.seriesColor }}>
						<DraftingCompass size={16} />
					</span>
				}
				onClick={onViewTraces}
			>
				<span data-testid="drilldown-view-traces">View in Traces</span>
			</ContextMenu.Item>
			<ContextMenu.Item
				icon={
					<span style={{ color: context.seriesColor }}>
						<ChartBar size={16} />
					</span>
				}
				onClick={onBreakout}
			>
				<span data-testid="drilldown-breakout">Breakout by ..</span>
			</ContextMenu.Item>
		</>
	);
}

export default DrilldownAggregateMenu;
