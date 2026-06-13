// eslint-disable-next-line signoz/no-antd-components -- TODO: migrate Radio to @signozhq/ui/radio-group
import { Col, Radio, Tooltip } from 'antd';
import { ExternalLink, SolidInfoCircle } from '@signozhq/icons';
import { Typography } from '@signozhq/ui/typography';
import logEvent from 'api/common/logEvent';
import { Events } from 'constants/events';
import { useDashboardCursorSyncMode } from 'hooks/dashboard/useDashboardCursorSyncMode';
import { useSyncTooltipFilterMode } from 'hooks/dashboard/useSyncTooltipFilterMode';
import {
	DashboardCursorSync,
	SyncTooltipFilterMode,
} from 'lib/uPlotV2/plugins/TooltipPlugin/types';
import { getAbsoluteUrl } from 'utils/basePath';
import cx from 'classnames';

import styles from '../GeneralSettings.module.scss';

interface CrossPanelSyncProps {
	dashboardId: string;
}

function CrossPanelSync({ dashboardId }: CrossPanelSyncProps): JSX.Element {
	const [cursorSyncMode, setCursorSyncMode] =
		useDashboardCursorSyncMode(dashboardId);
	const [syncTooltipFilterMode, setSyncTooltipFilterMode] =
		useSyncTooltipFilterMode(dashboardId);

	return (
		<Col className={cx(styles.overviewSettings, styles.crossPanelSyncGroup)}>
			<div className={styles.crossPanelSyncSectionHeader}>
				<Typography.Text className={styles.crossPanelSyncSectionTitle}>
					Cross-Panel Sync
				</Typography.Text>
				<Tooltip
					title={
						<div className={styles.crossPanelSyncTooltipContent}>
							<strong className={styles.crossPanelSyncTooltipTitle}>
								Cross-Panel Sync
							</strong>
							<span className={styles.crossPanelSyncTooltipDescription}>
								Sync crosshair and tooltip across all the dashboard panels
							</span>
							<a
								href="https://signoz.io/docs/dashboards/interactivity/#cross-panel-sync"
								target="_blank"
								rel="noopener noreferrer"
								className={styles.crossPanelSyncTooltipDocLink}
							>
								Learn more
								<ExternalLink size={12} />
							</a>
						</div>
					}
					placement="top"
					mouseEnterDelay={0.5}
				>
					<SolidInfoCircle size="md" className={styles.crossPanelSyncInfoIcon} />
				</Tooltip>
			</div>
			<div className={styles.crossPanelSyncRow}>
				<div className={styles.crossPanelSyncInfo}>
					<Typography.Text className={styles.crossPanelSyncTitle}>
						Sync Mode
					</Typography.Text>
					<Typography.Text className={styles.crossPanelSyncDescription}>
						Sync crosshair and tooltip across all the dashboard panels
					</Typography.Text>
				</div>
				<Radio.Group
					value={cursorSyncMode}
					onChange={(e): void => {
						setCursorSyncMode(e.target.value as DashboardCursorSync);
					}}
				>
					<Radio.Button value={DashboardCursorSync.None}>No Sync</Radio.Button>
					<Radio.Button value={DashboardCursorSync.Crosshair}>
						Crosshair
					</Radio.Button>
					<Radio.Button value={DashboardCursorSync.Tooltip}>Tooltip</Radio.Button>
				</Radio.Group>
			</div>
			{cursorSyncMode === DashboardCursorSync.Tooltip && (
				<div className={styles.crossPanelSyncRow}>
					<div className={styles.crossPanelSyncInfo}>
						<Typography.Text className={styles.crossPanelSyncTitle}>
							Synced Tooltip Series
						</Typography.Text>
						<Typography.Text className={styles.crossPanelSyncDescription}>
							Show only series that intersect on group-by, or every series with the
							matching ones highlighted
						</Typography.Text>
					</div>
					<Radio.Group
						value={syncTooltipFilterMode}
						onChange={(e): void => {
							void logEvent(Events.TOOLTIP_SYNC_MODE_CHANGED, {
								path: getAbsoluteUrl(window.location.pathname),
								mode: e.target.value,
							});
							setSyncTooltipFilterMode(e.target.value as SyncTooltipFilterMode);
						}}
					>
						<Radio.Button value={SyncTooltipFilterMode.All}>All</Radio.Button>
						<Radio.Button value={SyncTooltipFilterMode.Filtered}>
							Filtered
						</Radio.Button>
					</Radio.Group>
				</div>
			)}
		</Col>
	);
}

export default CrossPanelSync;
