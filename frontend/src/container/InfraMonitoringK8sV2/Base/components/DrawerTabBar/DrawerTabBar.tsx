import {
	BarChart,
	ChevronsLeftRight,
	Compass,
	DraftingCompass,
	ScrollText,
} from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@signozhq/ui/toggle-group';
import { TooltipSimple } from '@signozhq/ui/tooltip';

import { VIEW_TYPES } from '../../../constants';

import styles from '../../../EntityDetailsUtils/entityDetails.module.scss';

export interface DrawerTabVisibility {
	showMetrics: boolean;
	showLogs: boolean;
	showTraces: boolean;
	showEvents: boolean;
}

/** The parts of a custom tab the bar needs — deliberately not `render`. */
export interface DrawerTabDescriptor {
	key: string;
	label: string;
	icon: React.ReactNode;
}

interface DrawerTabBarProps {
	tabVisibility: DrawerTabVisibility;
	customTabs?: DrawerTabDescriptor[];
	selectedView: string;
	onTabChange: (value: string | null) => void;
	onExplorerRedirect: () => void;
}

/**
 * The drawer's Metrics · Logs · Traces · Events · <custom> tab bar, plus the
 * "go to explorer" compass that only the Logs and Traces tabs expose.
 *
 * Built from `ToggleGroup` + `ToggleGroupItem` rather than `ToggleGroupSimple`
 * because only the item-level component forwards a `testId`, and each tab needs
 * to be addressable as `drawer-tab-<view>`.
 */
export function DrawerTabBar({
	tabVisibility,
	customTabs,
	selectedView,
	onTabChange,
	onExplorerRedirect,
}: DrawerTabBarProps): JSX.Element {
	const showCompass =
		selectedView === VIEW_TYPES.LOGS || selectedView === VIEW_TYPES.TRACES;

	return (
		<div className={styles.viewsTabsContainer}>
			<ToggleGroup
				type="single"
				className={styles.viewsTabs}
				onChange={onTabChange}
				value={selectedView}
				testId="drawer-tab-bar"
			>
				{tabVisibility.showMetrics && (
					<ToggleGroupItem
						value={VIEW_TYPES.METRICS}
						testId={`drawer-tab-${VIEW_TYPES.METRICS}`}
					>
						<div className={styles.viewTitle}>
							<BarChart size={14} />
							Metrics
						</div>
					</ToggleGroupItem>
				)}
				{tabVisibility.showLogs && (
					<ToggleGroupItem
						value={VIEW_TYPES.LOGS}
						testId={`drawer-tab-${VIEW_TYPES.LOGS}`}
					>
						<div className={styles.viewTitle}>
							<ScrollText size={14} />
							Logs
						</div>
					</ToggleGroupItem>
				)}
				{tabVisibility.showTraces && (
					<ToggleGroupItem
						value={VIEW_TYPES.TRACES}
						testId={`drawer-tab-${VIEW_TYPES.TRACES}`}
					>
						<div className={styles.viewTitle}>
							<DraftingCompass size={14} />
							Traces
						</div>
					</ToggleGroupItem>
				)}
				{tabVisibility.showEvents && (
					<ToggleGroupItem
						value={VIEW_TYPES.EVENTS}
						testId={`drawer-tab-${VIEW_TYPES.EVENTS}`}
					>
						<div className={styles.viewTitle}>
							<ChevronsLeftRight size={14} />
							Events
						</div>
					</ToggleGroupItem>
				)}
				{customTabs?.map((tab) => (
					<ToggleGroupItem
						key={tab.key}
						value={tab.key}
						testId={`drawer-tab-${tab.key}`}
					>
						<div className={styles.viewTitle}>
							{tab.icon}
							{tab.label}
						</div>
					</ToggleGroupItem>
				))}
			</ToggleGroup>

			{showCompass && (
				<TooltipSimple
					title={
						selectedView === VIEW_TYPES.LOGS
							? 'Go to Logs Explorer'
							: 'Go to Traces Explorer'
					}
					side="left"
					arrow
				>
					<Button
						variant="ghost"
						size="icon"
						color="secondary"
						className={styles.compassButton}
						data-testid={
							selectedView === VIEW_TYPES.LOGS
								? 'open-logs-explorer'
								: 'open-traces-explorer'
						}
						onClick={onExplorerRedirect}
					>
						<Compass size={18} />
					</Button>
				</TooltipSimple>
			)}
		</div>
	);
}
