import { useState } from 'react';
import TagBadge from 'components/TagBadge/TagBadge';
import { Badge } from '@signozhq/ui/badge';
import { Button } from '@signozhq/ui/button';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import { Typography } from '@signozhq/ui/typography';
import { CalendarClock, LockKeyhole, Pin, PinOff } from '@signozhq/icons';
import cx from 'classnames';
import logEvent from 'api/common/logEvent';
import { generatePath } from 'react-router-dom';
import { Base64Icons } from 'container/DashboardContainer/DashboardSettings/General/utils';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import ROUTES from 'constants/routes';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { useTimezone } from 'providers/Timezone';
import { isModifierKeyPressed } from 'utils/app';

import { usePinDashboard } from '../../hooks/usePinDashboard';
import { useDashboardViewsStore } from '../../store/useDashboardViewsStore';
import type { DashboardListItem } from '../../utils/helpers';
import { lastUpdatedLabel, tagsToStrings } from '../../utils/helpers';
import ActionsPopover from '../ActionsPopover/ActionsPopover';
import LegacyDashboardDialog from '../LegacyDashboardDialog/LegacyDashboardDialog';

import styles from './DashboardRow.module.scss';

interface Props {
	dashboard: DashboardListItem;
	index: number;
	canEdit: boolean;
	showUpdatedAt: boolean;
	showUpdatedBy: boolean;
}

function DashboardRow({
	dashboard,
	index,
	canEdit,
	showUpdatedAt,
	showUpdatedBy,
}: Props): JSX.Element {
	const { safeNavigate } = useSafeNavigate();
	const { formatTimezoneAdjustedTimestamp } = useTimezone();

	const markViewed = useDashboardViewsStore((s) => s.markViewed);
	const { togglePin, isUpdating } = usePinDashboard();

	const [isLegacyDialogOpen, setIsLegacyDialogOpen] = useState(false);

	// A legacy dashboard is stored in the pre-v2 shape and has no v2 spec, so it
	// can't be opened in the new experience — clicking it explains this instead.
	const isLegacy = !!dashboard.legacy;
	const isPinned = !!dashboard.pinned;
	const id = dashboard.id;
	const name = dashboard.spec?.display?.name ?? '';
	const image = dashboard.image || Base64Icons[0];
	const createdBy = dashboard.createdBy ?? '';
	const updatedBy = dashboard.updatedBy ?? '';
	const createdAt = dashboard.createdAt ?? '';
	const updatedAt = dashboard.updatedAt ?? '';
	const isLocked = !!dashboard.locked;
	const tags = tagsToStrings(dashboard.tags);

	const link = generatePath(ROUTES.DASHBOARD, { dashboardId: id });
	const formattedCreatedAt = formatTimezoneAdjustedTimestamp(
		createdAt,
		DATE_TIME_FORMATS.DASH_DATETIME_UTC,
	);

	const onClickHandler = (event: React.MouseEvent<HTMLElement>): void => {
		// Clicks inside portaled overlays (the actions menu, edit modals) bubble here
		// through React's tree even though they render outside the row in the DOM.
		// Only navigate when the click actually landed inside the row.
		if (!event.currentTarget.contains(event.target as Node)) {
			return;
		}
		event.stopPropagation();
		if (isLegacy) {
			setIsLegacyDialogOpen(true);
			void logEvent('Dashboard List: Clicked on legacy dashboard', {
				dashboardId: id,
				dashboardName: name,
			});
			return;
		}
		markViewed(id);
		safeNavigate(link, { newTab: isModifierKeyPressed(event) });
		void logEvent('Dashboard List: Clicked on dashboard', {
			dashboardId: id,
			dashboardName: name,
		});
	};

	const onTogglePin = (event: React.MouseEvent<HTMLElement>): void => {
		event.stopPropagation();
		if (isLegacy) {
			return;
		}
		togglePin(id, isPinned);
	};

	const pinLabel = isPinned ? 'Unpin dashboard' : 'Pin dashboard';
	const pinTooltip = isLegacy
		? "This dashboard isn't available in the new experience, so it can't be pinned"
		: pinLabel;

	// Only long titles are truncated, so only they need the full-name tooltip;
	// wrapping conditionally avoids an empty hanging tooltip for short names.
	const titleLink = (
		<div className={styles.titleLink} onClick={onClickHandler}>
			<img src={image} alt="dashboard-image" className={styles.icon} />
			<Typography.Text
				data-testid={`dashboard-title-${index}`}
				className={styles.title}
			>
				{name}
			</Typography.Text>
		</div>
	);

	return (
		<>
			<div className={styles.row} onClick={onClickHandler}>
				<div className={styles.titleWithAction}>
					<div className={styles.titleBlock}>
						{name.length > 50 ? (
							<TooltipSimple title={name} side="bottom" disableHoverableContent>
								{titleLink}
							</TooltipSimple>
						) : (
							titleLink
						)}
						{isLegacy && (
							<Badge
								color="amber"
								variant="outline"
								className={styles.legacyBadge}
								testId={`dashboard-legacy-${index}`}
							>
								Legacy
							</Badge>
						)}
					</div>

					<div className={styles.tagsWithActions}>
						{tags.length > 0 && (
							<div className={styles.tags}>
								{tags.slice(0, 3).map((tag) => (
									<TagBadge key={tag}>{tag}</TagBadge>
								))}
								{tags.length > 3 && (
									<TagBadge key={tags[3]}>+{tags.length - 3}</TagBadge>
								)}
							</div>
						)}
					</div>

					{isLocked && (
						<TooltipSimple
							title="This dashboard is locked"
							side="top"
							disableHoverableContent
						>
							<span
								className={styles.lockIcon}
								data-testid={`dashboard-lock-${index}`}
							>
								<LockKeyhole size={14} />
							</span>
						</TooltipSimple>
					)}

					<TooltipSimple title={pinTooltip} side="top" disableHoverableContent>
						<span className={styles.pinButtonWrap}>
							<Button
								type="button"
								variant="ghost"
								color="secondary"
								size="icon"
								className={cx(styles.pinButton, {
									[styles.pinButtonOn]: isPinned && !isLegacy,
								})}
								aria-label={pinLabel}
								data-testid={`dashboard-pin-${index}`}
								disabled={isUpdating || isLegacy}
								onClick={onTogglePin}
							>
								{isPinned ? (
									<>
										<Pin size={14} className={styles.pinnedIcon} />
										<PinOff size={14} className={styles.unpinIcon} />
									</>
								) : (
									<Pin size={14} />
								)}
							</Button>
						</span>
					</TooltipSimple>

					<ActionsPopover
						link={link}
						dashboardId={id}
						dashboardName={name}
						createdBy={createdBy}
						isLocked={isLocked}
						tags={tags}
						canEdit={canEdit}
						onView={onClickHandler}
						isLegacy={isLegacy}
					/>
				</div>
				<div className={styles.details}>
					<div className={styles.createdAt}>
						<CalendarClock size={14} />
						<Typography.Text>{formattedCreatedAt}</Typography.Text>
					</div>

					{createdBy && (
						<div className={styles.createdBy}>
							<div className={styles.avatar}>
								<Typography.Text className={styles.avatarText}>
									{createdBy.substring(0, 1).toUpperCase()}
								</Typography.Text>
							</div>
							<Typography.Text className={styles.byLabel}>{createdBy}</Typography.Text>
						</div>
					)}

					{showUpdatedAt && (
						<div className={styles.createdAt}>
							<CalendarClock size={14} />
							<Typography.Text>{lastUpdatedLabel(updatedAt)}</Typography.Text>
						</div>
					)}

					{updatedBy && showUpdatedBy && (
						<div className={styles.updatedBy}>
							<Typography.Text className={styles.byLabel}>
								Last Updated By -
							</Typography.Text>
							<div className={styles.avatar}>
								<Typography.Text className={styles.avatarText}>
									{updatedBy.substring(0, 1).toUpperCase()}
								</Typography.Text>
							</div>
							<Typography.Text className={styles.byLabel}>{updatedBy}</Typography.Text>
						</div>
					)}
				</div>
			</div>
			{isLegacy && (
				<LegacyDashboardDialog
					open={isLegacyDialogOpen}
					dashboardId={id}
					dashboardName={name}
					onClose={(): void => setIsLegacyDialogOpen(false)}
				/>
			)}
		</>
	);
}

export default DashboardRow;
