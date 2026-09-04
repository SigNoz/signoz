import { Button } from '@signozhq/ui/button';
import Spinner from 'components/Spinner';
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
import { DashboardListEvents } from 'pages/DashboardsListPage/constants/events';
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
	// A non-empty reason is exactly "cannot toggle", so the flag is redundant here.
	const {
		isLoading: isLockPermissionLoading,
		disabledReason: lockDisabledReason,
		disabledKind: lockDisabledKind,
	} = useDashboardLockPermission({ dashboardId, createdBy });

	const { clone, isCloning } = useCloneDashboardAction({
		dashboardId,
		dashboardName,
	});
	const { toggleLock, isTogglingLock } = useLockToggleAction({
		dashboardId,
		isLocked,
	});

	// Access before state: someone without the permission needs to hear that, not
	// that the dashboard is locked. An edit-capable user still gets the lock.
	let editReason = '';
	if (!canEdit) {
		editReason = DASHBOARD_NO_EDIT_PERMISSION_REASON;
	} else if (isLocked) {
		editReason = DASHBOARD_LOCKED_REASON;
	}
	const editDenied = !canEdit;
	const editKind: 'denied' | 'blocked' =
		canEdit && isLocked ? 'blocked' : 'denied';

	// Clone reads the source and creates a new dashboard, so it needs both — and
	// it is not lock-gated, since the copy is a fresh unlocked dashboard.
	const editDisabled = editReason
		? { reason: editReason, kind: editKind }
		: undefined;
	const canClone = canRead && canCreate;
	const cloneDenied = !canClone;

	// The row's checks only fire when the menu opens, so hold the body until they
	// resolve — items must never render enabled and then flip to disabled.
	if (isPermissionLoading || isLockPermissionLoading) {
		return (
			<div className={styles.content}>
				<Spinner size="small" height="64px" />
			</div>
		);
	}

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
						deniedPermissions={editDenied ? editChecks : undefined}
						onClick={onOpenRename}
					/>
					<ActionsMenuItem
						label={tags.length > 0 ? 'Edit Tags' : 'Add Tags'}
						icon={<Tag size={14} />}
						testId="dashboard-action-edit-tags"
						disabled={editDisabled}
						deniedPermissions={editDenied ? editChecks : undefined}
						onClick={onOpenEditTags}
					/>
					<ActionsMenuItem
						label="Duplicate"
						icon={<Copy size={14} />}
						testId="dashboard-action-duplicate"
						disabled={
							cloneDenied
								? { reason: DASHBOARD_CLONE_DENIED_REASON, kind: 'denied' }
								: undefined
						}
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
						disabled={
							lockDisabledReason
								? { reason: lockDisabledReason, kind: lockDisabledKind }
								: undefined
						}
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
