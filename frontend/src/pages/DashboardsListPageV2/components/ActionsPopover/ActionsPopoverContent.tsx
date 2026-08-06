import { Tooltip } from 'antd';
import { Button } from '@signozhq/ui/button';
import {
	Copy,
	Expand,
	Link2,
	LockKeyhole,
	PenLine,
	SquareArrowOutUpRight,
	Tag,
} from '@signozhq/icons';
import { useCopyToClipboard } from 'react-use';
import logEvent from 'api/common/logEvent';
import { DashboardListEvents } from 'pages/DashboardsListPageV2/constants/events';
import { useAppContext } from 'providers/App/App';
import { USER_ROLES } from 'types/roles';
import { getAbsoluteUrl } from 'utils/basePath';
import { openInNewTab } from 'utils/navigation';

import DeleteActionItem from './DeleteActionItem';
import { useCloneDashboardAction } from './useCloneDashboardAction';
import { useLockToggleAction } from './useLockToggleAction';
import styles from './ActionsPopover.module.scss';

interface Props {
	link: string;
	dashboardId: string;
	dashboardName: string;
	createdBy: string;
	isLocked: boolean;
	tags: string[];
	// Edit permission (edit_dashboard). Read actions show regardless; edit actions are hidden without it.
	canEdit: boolean;
	isLegacy: boolean;
	onView: (event: React.MouseEvent<HTMLElement>) => void;
	onOpenRename: () => void;
	onOpenEditTags: () => void;
}

// The popover body. Mounted only while the popover is open, so a page of rows
// doesn't pay for 20 copies of the menu and its mutations.
function ActionsPopoverContent({
	link,
	dashboardId,
	dashboardName,
	createdBy,
	isLocked,
	tags,
	canEdit,
	isLegacy,
	onView,
	onOpenRename,
	onOpenEditTags,
}: Props): JSX.Element {
	const [, setCopy] = useCopyToClipboard();
	const { user } = useAppContext();

	const { clone, isCloning } = useCloneDashboardAction({
		dashboardId,
		dashboardName,
	});
	const { toggleLock, isTogglingLock } = useLockToggleAction({
		dashboardId,
		isLocked,
	});

	const isAuthor = user?.email === createdBy;
	// Author/admin can lock-unlock (mirrors the detail-page gate); integration-owned
	// dashboards are never toggleable.
	const canToggleLock =
		(isAuthor || user.role === USER_ROLES.ADMIN) && createdBy !== 'integration';

	const handleOpenInNewTab = (e: React.MouseEvent<HTMLElement>): void => {
		e.stopPropagation();
		e.preventDefault();
		openInNewTab(link);
		void logEvent(DashboardListEvents.RowAction, {
			action: 'openNewTab',
			dashboardId,
		});
	};

	const handleCopyLink = (e: React.MouseEvent<HTMLElement>): void => {
		e.stopPropagation();
		e.preventDefault();
		setCopy(getAbsoluteUrl(link));
		void logEvent(DashboardListEvents.RowAction, {
			action: 'copyLink',
			dashboardId,
		});
	};

	return (
		// Stop clicks inside the menu (incl. disabled items) from bubbling to the
		// row's onClick, which would navigate to the dashboard.
		// eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- wrapper only guards propagation, not an interactive control
		<div className={styles.content} onClick={(e): void => e.stopPropagation()}>
			{!isLegacy && (
				<>
					<Button
						color="secondary"
						className={styles.menuItem}
						prefix={<Expand size={14} />}
						onClick={onView}
						testId="dashboard-action-view"
					>
						View
					</Button>
					<Button
						color="secondary"
						className={styles.menuItem}
						prefix={<SquareArrowOutUpRight size={14} />}
						onClick={handleOpenInNewTab}
						testId="dashboard-action-open-new-tab"
					>
						Open in New Tab
					</Button>
					<Button
						color="secondary"
						className={styles.menuItem}
						prefix={<Link2 size={14} />}
						onClick={handleCopyLink}
						testId="dashboard-action-copy-link"
					>
						Copy Link
					</Button>
					{canEdit && (
						<Tooltip
							placement="left"
							title={
								isLocked ? 'This dashboard is locked, so it cannot be renamed.' : ''
							}
						>
							<span className={styles.menuItemWrap}>
								<Button
									color="secondary"
									className={styles.menuItem}
									prefix={<PenLine size={14} />}
									disabled={isLocked}
									onClick={(e): void => {
										e.stopPropagation();
										e.preventDefault();
										if (!isLocked) {
											onOpenRename();
										}
									}}
									testId="dashboard-action-rename"
								>
									Rename
								</Button>
							</span>
						</Tooltip>
					)}
					{canEdit && (
						<Tooltip
							placement="left"
							title={
								isLocked
									? 'This dashboard is locked, so its tags cannot be edited.'
									: ''
							}
						>
							<span className={styles.menuItemWrap}>
								<Button
									color="secondary"
									className={styles.menuItem}
									prefix={<Tag size={14} />}
									disabled={isLocked}
									onClick={(e): void => {
										e.stopPropagation();
										e.preventDefault();
										if (!isLocked) {
											onOpenEditTags();
										}
									}}
									testId="dashboard-action-edit-tags"
								>
									{tags.length > 0 ? 'Edit Tags' : 'Add Tags'}
								</Button>
							</span>
						</Tooltip>
					)}
					{canEdit && (
						<Button
							color="secondary"
							className={styles.menuItem}
							prefix={<Copy size={14} />}
							loading={isCloning}
							onClick={(e): void => {
								e.stopPropagation();
								e.preventDefault();
								clone();
							}}
							testId="dashboard-action-duplicate"
						>
							Duplicate
						</Button>
					)}
					{canToggleLock && (
						<Button
							color="secondary"
							className={styles.menuItem}
							prefix={<LockKeyhole size={14} />}
							loading={isTogglingLock}
							onClick={(e): void => {
								e.stopPropagation();
								e.preventDefault();
								toggleLock();
							}}
							testId="dashboard-action-lock"
						>
							{isLocked ? 'Unlock Dashboard' : 'Lock Dashboard'}
						</Button>
					)}
				</>
			)}
			{canEdit && (
				<DeleteActionItem
					dashboardId={dashboardId}
					dashboardName={dashboardName}
					createdBy={createdBy}
					isLocked={isLocked}
					showDivider={!isLegacy}
				/>
			)}
		</div>
	);
}

export default ActionsPopoverContent;
