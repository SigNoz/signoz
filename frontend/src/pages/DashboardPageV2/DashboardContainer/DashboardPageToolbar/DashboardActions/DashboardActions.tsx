import { useCallback, useEffect, useMemo, useState } from 'react';
import { FullScreenHandle } from 'react-full-screen';
import { useTranslation } from 'react-i18next';
import { generatePath } from 'react-router-dom';
import { useCopyToClipboard } from 'react-use';
import {
	Braces,
	ClipboardCopy,
	Configure,
	Copy,
	FileJson,
	Fullscreen,
	Grid3X3,
	LockKeyhole,
	PenLine,
	Plus,
	SquareStack,
	Trash2,
} from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { DropdownMenuSimple } from '@signozhq/ui/dropdown-menu';
import type { MenuItem } from '@signozhq/ui/dropdown-menu';
import { toast } from '@signozhq/ui/sonner';
import { cloneDashboardV2 } from 'api/generated/services/dashboard';
import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';
import ROUTES from 'constants/routes';
import { useDeleteDashboard } from 'hooks/dashboard/useDeleteDashboard';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import history from 'lib/history';
import { useAppContext } from 'providers/App/App';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';
import { USER_ROLES } from 'types/roles';

import ConfirmDeleteDialog from '../../components/ConfirmDeleteDialog/ConfirmDeleteDialog';
import DashboardSettings from '../../DashboardSettings';
import { useAddSection } from '../../PanelsAndSectionsLayout/Section/hooks/useAddSection';
import SectionTitleModal from '../../PanelsAndSectionsLayout/Section/SectionTitleModal';
import JsonEditorDrawer from '../JsonEditorDrawer/JsonEditorDrawer';
import SettingsDrawer from '../SettingsDrawer';
import styles from './DashboardActions.module.scss';
import { useDashboardStore } from '../../store/useDashboardStore';

interface DashboardActionsProps {
	title: string;
	dashboard: DashboardtypesGettableDashboardV2DTO;
	handle: FullScreenHandle;
	isDashboardLocked: boolean;
	isAuthor: boolean;
	onAddPanel: () => void;
	onLockToggle: () => void;
	onOpenRename: () => void;
}

function DashboardActions({
	title,
	dashboard,
	handle,
	isDashboardLocked,
	isAuthor,
	onAddPanel,
	onLockToggle,
	onOpenRename,
}: DashboardActionsProps): JSX.Element {
	const canEdit = useDashboardStore((s) => s.isEditable);
	const { user } = useAppContext();
	const { t } = useTranslation(['dashboard', 'common']);
	const { safeNavigate } = useSafeNavigate();
	const { showErrorModal } = useErrorModal();

	const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] =
		useState<boolean>(false);
	const [isJsonEditorOpen, setIsJsonEditorOpen] = useState<boolean>(false);
	const [isCloning, setIsCloning] = useState<boolean>(false);
	const [isNewSectionOpen, setIsNewSectionOpen] = useState<boolean>(false);

	const [state, setCopy] = useCopyToClipboard();
	const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false);
	const deleteDashboardMutation = useDeleteDashboard(dashboard.id);

	const { addSection, isSaving: isAddingSection } = useAddSection({
		layouts: dashboard.spec.layouts,
	});

	const handleCreateSection = useCallback(
		async (title: string): Promise<void> => {
			await addSection(title);
			setIsNewSectionOpen(false);
		},
		[addSection],
	);

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

	const handleClone = useCallback(async (): Promise<void> => {
		if (!dashboard.id) {
			return;
		}
		try {
			setIsCloning(true);
			const response = await cloneDashboardV2({ id: dashboard.id });
			toast.success('Dashboard cloned');
			safeNavigate(
				generatePath(ROUTES.DASHBOARD, { dashboardId: response.data.id }),
			);
		} catch (error) {
			showErrorModal(error as APIError);
		} finally {
			setIsCloning(false);
		}
	}, [dashboard.id, safeNavigate, showErrorModal]);

	const handleConfirmDelete = useCallback((): void => {
		deleteDashboardMutation.mutate(undefined, {
			onSuccess: () => {
				setIsDeleteOpen(false);
				history.replace(ROUTES.ALL_DASHBOARD);
			},
		});
	}, [deleteDashboardMutation]);

	const menuItems = useMemo<MenuItem[]>(() => {
		const dashboardGroup: MenuItem[] = [];
		if (canEdit) {
			dashboardGroup.push({
				key: 'rename',
				label: 'Rename',
				icon: <PenLine size={14} />,
				onClick: onOpenRename,
			});
		}
		dashboardGroup.push({
			key: 'clone',
			label: 'Clone dashboard',
			icon: <Copy size={14} />,
			disabled: isCloning,
			onClick: (): void => void handleClone(),
		});
		if (isAuthor || user.role === USER_ROLES.ADMIN) {
			dashboardGroup.push({
				key: 'lock',
				label: isDashboardLocked ? 'Unlock dashboard' : 'Lock dashboard',
				icon: <LockKeyhole size={14} />,
				disabled: dashboard.createdBy === 'integration',
				onClick: onLockToggle,
			});
		}
		dashboardGroup.push({
			key: 'fullscreen',
			label: 'Full screen',
			icon: <Fullscreen size={14} />,
			onClick: handle.enter,
		});

		const dataGroup: MenuItem[] = [
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

		const layoutGroup: MenuItem[] = [];
		if (canEdit) {
			layoutGroup.push({
				key: 'new-section',
				label: 'New section',
				icon: <SquareStack size={14} />,
				onClick: (): void => setIsNewSectionOpen(true),
			});
		}

		const items: MenuItem[] = [
			{
				type: 'group',
				key: 'group-dashboard',
				label: 'Dashboard',
				children: dashboardGroup,
			},
			{ type: 'group', key: 'group-data', label: 'Data', children: dataGroup },
		];
		if (layoutGroup.length > 0) {
			items.push({
				type: 'group',
				key: 'group-layout',
				label: 'Layout',
				children: layoutGroup,
			});
		}
		items.push(
			{ type: 'divider', key: 'divider-danger' },
			{
				key: 'delete',
				label: 'Delete dashboard',
				icon: <Trash2 size={14} />,
				danger: true,
				onClick: (): void => setIsDeleteOpen(true),
			},
		);
		return items;
	}, [
		canEdit,
		isCloning,
		isAuthor,
		user.role,
		isDashboardLocked,
		dashboard.createdBy,
		onOpenRename,
		handleClone,
		onLockToggle,
		handle.enter,
		exportJSON,
		setCopy,
		dashboardDataJSON,
	]);

	return (
		<div className={styles.dashboardActionsContainer}>
			<DropdownMenuSimple menu={{ items: menuItems }}>
				<Button
					variant="solid"
					color="secondary"
					size="md"
					prefix={<Grid3X3 size="md" />}
					testId="options"
				>
					Actions
				</Button>
			</DropdownMenuSimple>
			{canEdit && (
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
			<Button
				variant="solid"
				color="secondary"
				prefix={<Braces size="md" />}
				testId="edit-json"
				onClick={(): void => setIsJsonEditorOpen(true)}
				size="md"
			>
				Edit as JSON
			</Button>
			{!isDashboardLocked && (
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
			<JsonEditorDrawer
				dashboard={dashboard}
				isOpen={isJsonEditorOpen}
				onClose={(): void => setIsJsonEditorOpen(false)}
			/>
			<ConfirmDeleteDialog
				open={isDeleteOpen}
				title={`Delete dashboard"?`}
				description={`Are you sure you want to delete this dashboard - "${title}"? This action cannot be undone.`}
				isLoading={deleteDashboardMutation.isLoading}
				onConfirm={handleConfirmDelete}
				onClose={(): void => setIsDeleteOpen(false)}
			/>
			<SectionTitleModal
				open={isNewSectionOpen}
				heading="New section"
				okText="Create section"
				initialValue=""
				isSaving={isAddingSection}
				onClose={(): void => setIsNewSectionOpen(false)}
				onSubmit={handleCreateSection}
			/>
		</div>
	);
}

export default DashboardActions;
