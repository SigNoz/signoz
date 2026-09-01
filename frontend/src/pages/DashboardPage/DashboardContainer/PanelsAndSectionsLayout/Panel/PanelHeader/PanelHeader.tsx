import { Fragment, useMemo } from 'react';
import { Info, Loader } from '@signozhq/icons';
import { Typography } from '@signozhq/ui/typography';
import type {
	DashboardtypesPanelDTO,
	Querybuildertypesv5QueryWarnDataDTO as WarningDTO,
} from 'api/generated/services/sigNoz.schemas';
import cx from 'classnames';
import type { PanelTimePreferenceLabel } from 'pages/DashboardPage/DashboardContainer/hooks/resolvePanelTimeWindow';
import type { PanelQueryData } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import { isTransparentPanel } from 'pages/DashboardPage/DashboardContainer/Panels/utils/isTransparentPanel';

import type { PanelActionsConfig } from '../Panel';
import PanelActionsMenu from '../PanelActionsMenu/PanelActionsMenu';
import PanelHeaderSearch from './PanelHeaderSearch';
import PanelStatusPopover from '../PanelStatus/PanelStatusPopover';
import {
	panelStatusFromError,
	panelStatusFromMultipleEnabledQueries,
	panelStatusFromWarning,
} from '../PanelStatus/utils';
import styles from './PanelHeader.module.scss';
import { TooltipSimple } from '@signozhq/ui/tooltip';

interface PanelHeaderBaseProps {
	panelId: string;
	/** The panel itself — its query seeds the menu's "Create Alerts" action. */
	panel: DashboardtypesPanelDTO;
	/** Layout context for move/delete — absent outside editable sectioned mode. */
	panelActions?: PanelActionsConfig;
	/**
	 * Suppress the actions menu entirely — for the editor preview, where
	 * panel-level actions don't apply (some survive their gates without
	 * `panelActions`, so omitting it isn't enough).
	 */
	hideActions?: boolean;
}

interface QueryPanelHeaderProps extends PanelHeaderBaseProps {
	mode: 'query';
	/** The panel's query response — the menu's source for "Download as CSV". */
	data: PanelQueryData;
	/** Background refresh in flight — shows a spinner without blinking the chart. */
	isFetching: boolean;
	/** Latest query error — surfaced as a header error indicator. */
	error?: Error | null;
	/** Non-fatal query warning lifted from the response payload. */
	warning?: WarningDTO;
	/** Per-panel time-preference label; null when it follows the dashboard window. */
	timeLabel?: PanelTimePreferenceLabel | null;
	/** Kind declares header search — renders the box. */
	searchable?: boolean;
	/** Current search term; shell owns it, the renderer applies the filter. */
	searchTerm?: string;
	/** Pushes a new search term up to the shell. */
	onSearchChange?: (value: string) => void;
}

interface StaticPanelHeaderProps extends PanelHeaderBaseProps {
	mode: 'static';
}

type PanelHeaderProps = QueryPanelHeaderProps | StaticPanelHeaderProps;

/** Panel chrome: drag handle, title, refetch + status indicators, actions. */
function PanelHeader(props: PanelHeaderProps): JSX.Element {
	const { panelId, panel, panelActions, hideActions } = props;
	const query = props.mode === 'query' ? props : null;

	const name = panel.spec.display.name;
	const description = panel.spec.display.description;
	const errorDetail = useMemo(
		() => panelStatusFromError(query?.error),
		[query?.error],
	);

	const warningDetail = useMemo(
		() => panelStatusFromWarning(query?.warning),
		[query?.warning],
	);

	// Client-derived: warn a Number panel that has more than one enabled query (#9512).
	const multiQueryWarningDetail = useMemo(
		() => panelStatusFromMultipleEnabledQueries(panel),
		[panel],
	);

	/**
	 * Hide the entire header when there's no title, description, or status to show,
	 * and the actions menu is suppressed (editor preview).
	 */
	if (
		!name &&
		!description &&
		!errorDetail &&
		!warningDetail &&
		!multiQueryWarningDetail &&
		hideActions
	) {
		return <Fragment />;
	}

	return (
		<div
			className={cx(styles.header, 'panel-drag-handle', {
				[styles.transparent]: isTransparentPanel(panel.spec),
			})}
		>
			<div className={styles.headerLeft}>
				<Typography.Text className={styles.headerTitle}>{name}</Typography.Text>
				{description && (
					<TooltipSimple
						title={description}
						arrow
						tooltipContentProps={{ className: styles.descriptionTooltip }}
					>
						<Info
							className={styles.headerInfoIcon}
							size={14}
							data-testid="panel-header-info-icon"
						/>
					</TooltipSimple>
				)}
				{query?.isFetching && (
					<Loader
						size={12}
						className={cx('animate-spin', styles.refetchIndicator)}
						data-testid="panel-refetching"
					/>
				)}
			</div>
			{/* `panel-no-drag` opts this region out of the drag handle so clicks hit
			    the controls instead of starting a panel drag. */}
			<div className={cx('panel-no-drag', styles.actions)}>
				{query?.searchable && query.onSearchChange && (
					<PanelHeaderSearch
						value={query.searchTerm ?? ''}
						onChange={query.onSearchChange}
					/>
				)}
				{query?.timeLabel && (
					<TooltipSimple title={query.timeLabel.full} arrow>
						<span className={styles.timePill} data-testid="panel-time-preference">
							{query.timeLabel.short}
						</span>
					</TooltipSimple>
				)}
				{errorDetail && <PanelStatusPopover variant="error" detail={errorDetail} />}
				{warningDetail && (
					<PanelStatusPopover variant="warning" detail={warningDetail} />
				)}
				{multiQueryWarningDetail && (
					<PanelStatusPopover
						variant="warning"
						detail={multiQueryWarningDetail}
						testId="panel-status-config-warning"
					/>
				)}
				{/* Renders nothing when no action survives its gates (kind/role/context). */}
				{!hideActions && (
					<PanelActionsMenu
						panelId={panelId}
						panel={panel}
						data={query?.data}
						panelActions={panelActions}
					/>
				)}
			</div>
		</div>
	);
}

export default PanelHeader;
