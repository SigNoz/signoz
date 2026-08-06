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
import {
	DASHBOARD_CLONE_DENIED_REASON,
	DASHBOARD_LOCKED_REASON,
	DASHBOARD_NO_EDIT_PERMISSION_REASON,
} from 'hooks/dashboards/dashboardPermissionReasons';
import { useDashboardCollectionPermissions } from 'hooks/dashboards/useDashboardCollectionPermissions';
import { useDashboardLockPermission } from 'hooks/dashboards/useDashboardLockPermission';
import { useDashboardPermissions } from 'hooks/dashboards/useDashboardPermissions';
import { DashboardCreatePermission } from 'lib/authz/hooks/useAuthZ/permissions/dashboard.permissions';
import { DashboardListEvents } from 'pages/DashboardsListPageV2/constants/events';
import { getAbsoluteUrl } from 'utils/basePath';
import { openInNewTab } from 'utils/navigation';

import ActionsMenuItem from './ActionsMenuItem';
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
	isLegacy: boolean;
	onView: (event: React.MouseEvent<HTMLElement>) => void;
	onOpenRename: () => void;
	onOpenEditTags: () => void;
}

// The popover body. Mounted only while the popover is open, so a page of rows
// doesn't pay for 20 copies of the menu, its mutations or its permission checks.
function ActionsPopoverContent({
	link,
	dashboardId,
	dashboardName,
	createdBy,
	isLocked,
	tags,
	isLegacy,
	onView,
	onOpenRename,
	onOpenEditTags,
}: Props): JSX.Element {
	const [, setCopy] = useCopyToClipboard();

	const {
		canEdit,
		canRead,
		isLoading: isPermissionLoading,
		editChecks,
		readPermission,
	} = useDashboardPermissions(dashboardId);
	const { canCreate } = useDashboardCollectionPermissions();
	const {
		canToggleLock,
		isLoading: isLockPermissionLoading,
		disabledReason: lockDisabledReason,
	} = useDashboardLockPermission({ dashboardId, createdBy });

	const { clone, isCloning } = useCloneDashboardAction({
		dashboardId,
		dashboardName,
	});
	const { toggleLock, isTogglingLock } = useLockToggleAction({
		dashboardId,
		isLocked,
	});

	// Lock wins over permission: an editor looking at a locked dashboard should be
	// told about the lock, which is the thing they can act on.
	const editDisabled = isPermissionLoading || isLocked || !canEdit;
	let editReason = '';
	if (!isPermissionLoading) {
		if (isLocked) {
			editReason = DASHBOARD_LOCKED_REASON;
		} else if (!canEdit) {
			editReason = DASHBOARD_NO_EDIT_PERMISSION_REASON;
		}
	}
	const editDenied = !isPermissionLoading && !isLocked && !canEdit;

	// Clone reads the source and creates a new dashboard, so it needs both — and
	// it is not lock-gated, since the copy is a fresh unlocked dashboard.
	const canClone = canRead && canCreate;
	const cloneDenied = !isPermissionLoading && !canClone;

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
						onClick={(e): void => {
							e.stopPropagation();
							e.preventDefault();
							openInNewTab(link);
							void logEvent(DashboardListEvents.RowAction, {
								action: 'openNewTab',
								dashboardId,
							});
						}}
						testId="dashboard-action-open-new-tab"
					>
						Open in New Tab
					</Button>
					<Button
						color="secondary"
						className={styles.menuItem}
						prefix={<Link2 size={14} />}
						onClick={(e): void => {
							e.stopPropagation();
							e.preventDefault();
							setCopy(getAbsoluteUrl(link));
							void logEvent(DashboardListEvents.RowAction, {
								action: 'copyLink',
								dashboardId,
							});
						}}
						testId="dashboard-action-copy-link"
					>
						Copy Link
					</Button>
					<ActionsMenuItem
						label="Rename"
						icon={<PenLine size={14} />}
						testId="dashboard-action-rename"
						disabled={editDisabled}
						reason={editReason}
						deniedPermissions={editDenied ? editChecks : undefined}
						onClick={onOpenRename}
					/>
					<ActionsMenuItem
						label={tags.length > 0 ? 'Edit Tags' : 'Add Tags'}
						icon={<Tag size={14} />}
						testId="dashboard-action-edit-tags"
						disabled={editDisabled}
						reason={editReason}
						deniedPermissions={editDenied ? editChecks : undefined}
						onClick={onOpenEditTags}
					/>
					<ActionsMenuItem
						label="Duplicate"
						icon={<Copy size={14} />}
						testId="dashboard-action-duplicate"
						disabled={isPermissionLoading || !canClone}
						reason={cloneDenied ? DASHBOARD_CLONE_DENIED_REASON : ''}
						deniedPermissions={
							cloneDenied ? [readPermission, DashboardCreatePermission] : undefined
						}
						loading={isCloning}
						onClick={clone}
					/>
					<ActionsMenuItem
						label={isLocked ? 'Unlock Dashboard' : 'Lock Dashboard'}
						icon={<LockKeyhole size={14} />}
						testId="dashboard-action-lock"
						disabled={isLockPermissionLoading || !canToggleLock}
						reason={lockDisabledReason}
						loading={isTogglingLock}
						onClick={toggleLock}
					/>
				</>
			)}
			<DeleteActionItem
				dashboardId={dashboardId}
				dashboardName={dashboardName}
				isLocked={isLocked}
				showDivider={!isLegacy}
			/>
		</div>
	);
}

export default ActionsPopoverContent;
