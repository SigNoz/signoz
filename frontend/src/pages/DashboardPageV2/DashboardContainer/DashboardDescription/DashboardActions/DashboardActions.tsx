import { useCallback, useEffect, useMemo, useState } from 'react';
import { FullScreenHandle } from 'react-full-screen';
import { useTranslation } from 'react-i18next';
import { useCopyToClipboard } from 'react-use';
import {
	ClipboardCopy,
	Configure,
	Ellipsis,
	FileJson,
	Fullscreen,
	LockKeyhole,
	PenLine,
	Plus,
	Trash2,
} from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { DropdownMenuSimple } from '@signozhq/ui/dropdown-menu';
import type { MenuItem } from '@signozhq/ui/dropdown-menu';
import { toast } from '@signozhq/ui/sonner';
import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';
import ROUTES from 'constants/routes';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import { useDeleteDashboard } from 'hooks/dashboard/useDeleteDashboard';
import history from 'lib/history';
import { useAppContext } from 'providers/App/App';
import { USER_ROLES } from 'types/roles';

import ConfirmDeleteDialog from '../../components/ConfirmDeleteDialog/ConfirmDeleteDialog';
import DashboardSettings from '../../DashboardSettings';
import SettingsDrawer from '../SettingsDrawer';
import styles from '../DashboardDescription.module.scss';

interface DashboardActionsProps {
	dashboard: DashboardtypesGettableDashboardV2DTO;
	handle: FullScreenHandle;
	isDashboardLocked: boolean;
	editDashboard: boolean;
	isAuthor: boolean;
	addPanelPermission: boolean;
	onAddPanel: () => void;
	onLockToggle: () => void;
	onOpenRename: () => void;
}

function DashboardActions({
	dashboard,
	handle,
	isDashboardLocked,
	editDashboard,
	isAuthor,
	addPanelPermission,
	onAddPanel,
	onLockToggle,
	onOpenRename,
}: DashboardActionsProps): JSX.Element {
	const { user } = useAppContext();
	const { t } = useTranslation(['dashboard', 'common']);

	const id = dashboard.id ?? '';
	const title = dashboard.spec?.display?.name ?? '';

	const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] =
		useState<boolean>(false);

	const [state, setCopy] = useCopyToClipboard();
	const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false);
	const deleteDashboardMutation = useDeleteDashboard(id);

	useEffect(() => {
		if (state.error) {
			toast.error(t('something_went_wrong', { ns: 'common' }));
		}
		if (state.value) {
			toast.success(t('success', { ns: 'common' }));
		}
	}, [state.error, state.value, t]);

	const dashboardDataJSON = useCallback(
		(): string => JSON.stringify(dashboard, null, 2),
		[dashboard],
	);

	const exportJSON = useCallback((): void => {
		const blob = new Blob([dashboardDataJSON()], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `${title || 'dashboard'}.json`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}, [dashboardDataJSON, title]);

	const handleConfirmDelete = useCallback((): void => {
		deleteDashboardMutation.mutate(undefined, {
			onSuccess: () => {
				setIsDeleteOpen(false);
				history.replace(ROUTES.ALL_DASHBOARD);
			},
		});
	}, [deleteDashboardMutation]);

	const menuItems = useMemo<MenuItem[]>(() => {
		const editGroup: MenuItem[] = [];
		if (!isDashboardLocked && editDashboard) {
			editGroup.push({
				key: 'rename',
				label: 'Rename',
				icon: <PenLine size={14} />,
				onClick: onOpenRename,
			});
		}
		if (isAuthor || user.role === USER_ROLES.ADMIN) {
			editGroup.push({
				key: 'lock',
				label: isDashboardLocked ? 'Unlock dashboard' : 'Lock dashboard',
				icon: <LockKeyhole size={14} />,
				disabled: dashboard.createdBy === 'integration',
				onClick: onLockToggle,
			});
		}
		editGroup.push({
			key: 'fullscreen',
			label: 'Full screen',
			icon: <Fullscreen size={14} />,
			onClick: handle.enter,
		});

		const exportGroup: MenuItem[] = [
			{
				key: 'export',
				label: 'Export JSON',
				icon: <FileJson size={14} />,
				onClick: exportJSON,
			},
			{
				key: 'copy',
				label: 'Copy as JSON',
				icon: <ClipboardCopy size={14} />,
				onClick: (): void => setCopy(dashboardDataJSON()),
			},
		];

		const dangerGroup: MenuItem[] = [
			{
				key: 'delete',
				label: 'Delete dashboard',
				icon: <Trash2 size={14} />,
				danger: true,
				onClick: (): void => setIsDeleteOpen(true),
			},
		];

		return [editGroup, exportGroup, dangerGroup]
			.filter((group) => group.length > 0)
			.flatMap((group, index) =>
				index > 0 ? [{ type: 'divider' } as MenuItem, ...group] : group,
			);
	}, [
		isDashboardLocked,
		editDashboard,
		isAuthor,
		user.role,
		dashboard.createdBy,
		onOpenRename,
		onLockToggle,
		handle.enter,
		exportJSON,
		setCopy,
		dashboardDataJSON,
	]);

	return (
		<div className={styles.rightSection}>
			<DateTimeSelectionV2 showAutoRefresh hideShareModal />
			<DropdownMenuSimple menu={{ items: menuItems }}>
				<Button
					variant="ghost"
					color="secondary"
					size="icon"
					prefix={<Ellipsis size={14} />}
					className={styles.icons}
					testId="options"
				/>
			</DropdownMenuSimple>
			{!isDashboardLocked && editDashboard && (
				<>
					<Button
						variant="solid"
						color="secondary"
						prefix={<Configure size="md" />}
						testId="show-drawer"
						onClick={(): void => setIsSettingsDrawerOpen(true)}
						size="md"
					>
						Configure
					</Button>
					<SettingsDrawer
						drawerTitle="Dashboard Configuration"
						isOpen={isSettingsDrawerOpen}
						onClose={(): void => setIsSettingsDrawerOpen(false)}
					>
						<DashboardSettings dashboard={dashboard} />
					</SettingsDrawer>
				</>
			)}
			{!isDashboardLocked && addPanelPermission && (
				<Button
					variant="solid"
					color="primary"
					onClick={onAddPanel}
					prefix={<Plus size="md" />}
					testId="add-panel-header"
					size="md"
				>
					New Panel
				</Button>
			)}
			<ConfirmDeleteDialog
				open={isDeleteOpen}
				title={`Delete dashboard "${title}"?`}
				description="This action cannot be undone."
				isLoading={deleteDashboardMutation.isLoading}
				onConfirm={handleConfirmDelete}
				onClose={(): void => setIsDeleteOpen(false)}
			/>
		</div>
	);
}

export default DashboardActions;
