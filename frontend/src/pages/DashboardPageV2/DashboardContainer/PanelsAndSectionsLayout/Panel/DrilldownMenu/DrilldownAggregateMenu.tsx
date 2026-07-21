import { useMemo } from 'react';
import {
	Braces,
	ChartBar,
	DraftingCompass,
	Link,
	Loader,
	ScrollText,
} from '@signozhq/icons';
import logEvent from 'api/common/logEvent';
import type { DashboardtypesLinkDTO } from 'api/generated/services/sigNoz.schemas';
import { getAggregateColumnHeader } from 'container/QueryTable/Drilldown/drilldownUtils';
import ContextMenu from 'periscope/components/ContextMenu';
import type { DrilldownContext } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/drilldown';
import { getDataLinks } from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/drilldown/getDataLinks';
import { resolvePanelContextLinks } from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/drilldown/resolvePanelContextLinks';
import { DashboardDetailEvents } from 'pages/DashboardPageV2/constants/events';
import type { Query } from 'types/api/queryBuilder/queryBuilderData';
import { openInNewTab } from 'utils/navigation';

import { useDrilldownContextVariables } from '../hooks/useDrilldownContextVariables';

import styles from './DrilldownAggregateMenu.module.scss';

interface DrilldownAggregateMenuProps {
	context: DrilldownContext;
	/** Panel's V5→V1 query — supplies the aggregation-expression header fallback. */
	query: Query;
	/** While dashboard variables resolve, the actions show a spinner and are disabled. */
	isResolving?: boolean;
	/** Panel's context links; resolved against the clicked point + variables here. */
	links: DashboardtypesLinkDTO[] | undefined;
	/** Whether the clicked point exposes group-by fields to bind to dashboard variables. */
	canSetDashboardVariables: boolean;
	onViewLogs: () => void;
	onViewTraces: () => void;
	onBreakout: () => void;
	/** Open the Dashboard Variables submenu (set/unset/create from the clicked value). */
	onSetDashboardVariables: () => void;
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
	isResolving = false,
	links,
	canSetDashboardVariables,
	onViewLogs,
	onViewTraces,
	onBreakout,
	onSetDashboardVariables,
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
	// Auto links derived from the clicked point itself (e.g. "View Trace Details" for a trace_id).
	const dataLinks = useMemo(
		() => getDataLinks(context.filters),
		[context.filters],
	);

	const handleViewLogs = (): void => {
		void logEvent(DashboardDetailEvents.DrilldownAction, {
			action: 'viewLogs',
		});
		onViewLogs();
	};

	const handleViewTraces = (): void => {
		void logEvent(DashboardDetailEvents.DrilldownAction, {
			action: 'viewTraces',
		});
		onViewTraces();
	};

	return (
		<>
			<ContextMenu.Header>
				<div className={styles.signal}>{context.signal}</div>
				<div className={styles.label} style={{ color: context.seriesColor }}>
					{context.label || aggregations}
				</div>
			</ContextMenu.Header>
			{canSetDashboardVariables && (
				<ContextMenu.Item
					icon={
						<span style={{ color: context.seriesColor }}>
							<Braces size={16} />
						</span>
					}
					onClick={onSetDashboardVariables}
				>
					<span data-testid="drilldown-dashboard-variables">
						Dashboard Variables
					</span>
				</ContextMenu.Item>
			)}
			<ContextMenu.Item
				icon={
					isResolving ? (
						<Loader className="animate-spin" size={16} color={context.seriesColor} />
					) : (
						<span style={{ color: context.seriesColor }}>
							<ScrollText size={16} />
						</span>
					)
				}
				onClick={handleViewLogs}
				disabled={isResolving}
			>
				<span data-testid="drilldown-view-logs">View in Logs</span>
			</ContextMenu.Item>
			<ContextMenu.Item
				icon={
					isResolving ? (
						<Loader className="animate-spin" color={context.seriesColor} size={16} />
					) : (
						<span style={{ color: context.seriesColor }}>
							<DraftingCompass size={16} />
						</span>
					)
				}
				onClick={handleViewTraces}
				disabled={isResolving}
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
			{dataLinks.map((link) => (
				<ContextMenu.Item
					key={link.id}
					icon={<Link size={16} color={context.seriesColor} />}
					onClick={(): void => {
						void logEvent(DashboardDetailEvents.DrilldownAction, {
							action: 'contextLink',
						});
						openInNewTab(link.url);
						onClose();
					}}
				>
					<span data-testid="drilldown-data-link">{link.label}</span>
				</ContextMenu.Item>
			))}
			{contextLinks.map((link) => (
				<ContextMenu.Item
					key={link.id}
					icon={<Link size={16} color={context.seriesColor} />}
					onClick={(): void => {
						void logEvent(DashboardDetailEvents.DrilldownAction, {
							action: 'contextLink',
						});
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
