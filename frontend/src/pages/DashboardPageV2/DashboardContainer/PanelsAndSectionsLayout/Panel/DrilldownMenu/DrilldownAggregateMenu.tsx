import { useMemo } from 'react';
import { ChartBar, DraftingCompass, Link, ScrollText } from '@signozhq/icons';
import type { DashboardLinkDTO } from 'api/generated/services/sigNoz.schemas';
import { getAggregateColumnHeader } from 'container/QueryTable/Drilldown/drilldownUtils';
import ContextMenu from 'periscope/components/ContextMenu';
import type { DrilldownContext } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/drilldown';
import { resolvePanelContextLinks } from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/drilldown/resolvePanelContextLinks';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';
import { openInNewTab } from 'utils/navigation';

import { useDrilldownContextVariables } from '../hooks/useDrilldownContextVariables';

interface DrilldownAggregateMenuProps {
	context: DrilldownContext;
	/** Panel's V5→V1 query — supplies the aggregation-expression header fallback. */
	query: Query;
	/** Panel's context links; resolved against the clicked point + variables here. */
	links: DashboardLinkDTO[] | undefined;
	onViewLogs: () => void;
	onViewTraces: () => void;
	onBreakout: () => void;
	/** Close the popover (context-link clicks). */
	onClose: () => void;
}

/**
 * The base aggregate drill-down menu: tinted header + View in Logs/Traces, Breakout, and the
 * panel's context links. Mounted only while open, so the variable/link resolution runs only then.
 * Metrics is omitted — V1 surfaces only Logs/Traces.
 */
function DrilldownAggregateMenu({
	context,
	query,
	links,
	onViewLogs,
	onViewTraces,
	onBreakout,
	onClose,
}: DrilldownAggregateMenuProps): JSX.Element {
	const aggregations = useMemo(
		() => getAggregateColumnHeader(query, context.queryName).aggregations,
		[query, context.queryName],
	);

	const processedVariables = useDrilldownContextVariables(context);
	const contextLinks = useMemo(
		() => resolvePanelContextLinks(links, processedVariables),
		[links, processedVariables],
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
			{contextLinks.map((link) => (
				<ContextMenu.Item
					key={link.id}
					icon={<Link size={16} />}
					onClick={(): void => {
						openInNewTab(link.url);
						onClose();
					}}
				>
					<span data-testid="drilldown-context-link">{link.label}</span>
				</ContextMenu.Item>
			))}
		</>
	);
}

export default DrilldownAggregateMenu;
