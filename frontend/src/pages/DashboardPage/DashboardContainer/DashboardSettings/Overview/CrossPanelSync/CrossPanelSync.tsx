import { ExternalLink, SolidInfoCircle } from '@signozhq/icons';
import { Tooltip } from '@signozhq/ui/tooltip';
import { Typography } from '@signozhq/ui/typography';
import logEvent from 'api/common/logEvent';
import { Events } from 'constants/events';
import { DashboardDetailEvents } from 'pages/DashboardPage/constants/events';
import { useDashboardCursorSyncMode } from 'hooks/dashboard/useDashboardCursorSyncMode';
import { useSyncTooltipFilterMode } from 'hooks/dashboard/useSyncTooltipFilterMode';
import {
	DashboardCursorSync,
	SyncTooltipFilterMode,
} from 'lib/uPlotV2/plugins/TooltipPlugin/types';
import { getAbsoluteUrl } from 'utils/basePath';
import cx from 'classnames';

import SegmentedControl from '../SegmentedControl/SegmentedControl';
import settingsStyles from '../../DashboardSettings.module.scss';
import styles from './CrossPanelSync.module.scss';

interface CrossPanelSyncProps {
	dashboardId: string;
}

function CrossPanelSync({ dashboardId }: CrossPanelSyncProps): JSX.Element {
	const [cursorSyncMode, setCursorSyncMode] =
		useDashboardCursorSyncMode(dashboardId);
	const [syncTooltipFilterMode, setSyncTooltipFilterMode] =
		useSyncTooltipFilterMode(dashboardId);

	const handleCursorSyncChange = (value: DashboardCursorSync): void => {
		void logEvent(DashboardDetailEvents.CursorSyncChanged, {
			mode: value,
			dashboardId,
		});
		setCursorSyncMode(value);
	};

	const handleTooltipFilterModeChange = (value: SyncTooltipFilterMode): void => {
		void logEvent(Events.TOOLTIP_SYNC_MODE_CHANGED, {
			path: getAbsoluteUrl(window.location.pathname),
			mode: value,
		});
		setSyncTooltipFilterMode(value);
	};

	return (
		<div className={cx(settingsStyles.settingsCard, styles.crossPanelSyncGroup)}>
			<div className={styles.crossPanelSyncSectionHeader}>
				<Typography
					variant="paragraph"
					size="base"
					weight="medium"
					color="main"
					as="span"
					textOverflow="wrap"
				>
					Cross-Panel Sync
				</Typography>

				<Tooltip
					side="top"
					title={
						<div className={styles.crossPanelSyncTooltipContent}>
							<strong className={styles.crossPanelSyncTooltipTitle}>
								Cross-Panel Sync
							</strong>
							<span className={styles.crossPanelSyncTooltipDescription}>
								Sync crosshair and tooltip across all the dashboard panels
							</span>
							<Typography.Link
								variant="paragraph"
								size="small"
								weight="regular"
								display="inline-flex"
								gap={2}
								marginTop={8}
								textOverflow="wrap"
								href="https://signoz.io/docs/dashboards/interactivity/#cross-panel-sync"
								target="_blank"
							>
								Learn more
								<ExternalLink size={12} />
							</Typography.Link>
						</div>
					}
				>
					<SolidInfoCircle size="md" className={styles.crossPanelSyncInfoIcon} />
				</Tooltip>
			</div>

			<div className={styles.crossPanelSyncRow}>
				<div className={styles.crossPanelSyncInfo}>
					<Typography
						variant="paragraph"
						size="base"
						weight="regular"
						color="secondary"
						as="span"
						textOverflow="wrap"
					>
						Sync Mode
					</Typography>
					<Typography
						variant="paragraph"
						size="base"
						weight="regular"
						color="tertiary"
						as="span"
						textOverflow="wrap"
					>
						Sync crosshair and tooltip across all the dashboard panels
					</Typography>
				</div>
				<SegmentedControl
					testId="cursor-sync-mode"
					value={cursorSyncMode}
					onChange={handleCursorSyncChange}
					options={[
						{ label: 'No Sync', value: DashboardCursorSync.None },
						{ label: 'Crosshair', value: DashboardCursorSync.Crosshair },
						{ label: 'Tooltip', value: DashboardCursorSync.Tooltip },
					]}
				/>
			</div>

			{cursorSyncMode === DashboardCursorSync.Tooltip && (
				<div className={styles.crossPanelSyncRow}>
					<div className={styles.crossPanelSyncInfo}>
						<Typography
							variant="paragraph"
							size="base"
							weight="regular"
							color="secondary"
							as="span"
							textOverflow="wrap"
						>
							Synced Tooltip Series
						</Typography>
						<Typography
							variant="paragraph"
							size="base"
							weight="regular"
							color="tertiary"
							as="span"
							textOverflow="wrap"
						>
							Show only series that intersect on group-by, or every series with the
							matching ones highlighted
						</Typography>
					</div>

					<SegmentedControl
						testId="sync-tooltip-filter-mode"
						value={syncTooltipFilterMode}
						onChange={handleTooltipFilterModeChange}
						options={[
							{ label: 'All', value: SyncTooltipFilterMode.All },
							{ label: 'Filtered', value: SyncTooltipFilterMode.Filtered },
						]}
					/>
				</div>
			)}
		</div>
	);
}

export default CrossPanelSync;
