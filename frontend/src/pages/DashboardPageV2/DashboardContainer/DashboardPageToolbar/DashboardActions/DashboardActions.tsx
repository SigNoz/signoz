import {
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
import { FullScreenHandle } from 'react-full-screen';
import { generatePath } from 'react-router-dom';
import {
	Braces,
	Configure,
	Copy,
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
import logEvent from 'api/common/logEvent';
import { cloneDashboardV2 } from 'api/generated/services/dashboard';
import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';
import ROUTES from 'constants/routes';
import { useDeleteDashboard } from 'hooks/dashboard/useDeleteDashboard';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import history from 'lib/history';
import { DashboardDetailEvents } from 'pages/DashboardPageV2/constants/events';
import { useAppContext } from 'providers/App/App';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';
import { USER_ROLES } from 'types/roles';

import ConfirmDeleteDialog from '../../components/ConfirmDeleteDialog/ConfirmDeleteDialog';
import DisabledControlTooltip from '../../components/DisabledControlTooltip/DisabledControlTooltip';
import DisabledMenuItemLabel from '../../components/DisabledMenuItemLabel/DisabledMenuItemLabel';
import DashboardSettings from '../../DashboardSettings';
import { useAddSection } from '../../PanelsAndSectionsLayout/Section/hooks/useAddSection';
import SectionTitleModal from '../../PanelsAndSectionsLayout/Section/SectionTitleModal';
import JsonEditorDrawer from '../JsonEditorDrawer/JsonEditorDrawer';
import SettingsDrawer from '../SettingsDrawer';
import styles from './DashboardActions.module.scss';
import { DASHBOARD_LOCKED_REASON } from '../../hooks/useDashboardEditGuard';
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
	const canEditDashboard = useDashboardStore((s) => s.canEditDashboard);
	const isLocked = useDashboardStore((s) => s.isLocked);
	const isEditable = useDashboardStore((s) => s.isEditable);
	const settingsRequest = useDashboardStore((s) => s.settingsRequest);
	const clearSettingsRequest = useDashboardStore((s) => s.clearSettingsRequest);
	const { user } = useAppContext();
	const { safeNavigate } = useSafeNavigate();
	const { showErrorModal } = useErrorModal();

	const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] =
		useState<boolean>(false);
	const [isJsonEditorOpen, setIsJsonEditorOpen] = useState<boolean>(false);
	const [isCloning, setIsCloning] = useState<boolean>(false);
	const [isNewSectionOpen, setIsNewSectionOpen] = useState<boolean>(false);

	const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false);
	const deleteDashboardMutation = useDeleteDashboard(dashboard.id);

	// Open the settings drawer when something in the tree requests it (e.g. the
	// variables bar's "Add variable" button).
	useEffect(() => {
		if (settingsRequest) {
			setIsSettingsDrawerOpen(true);
		}
	}, [settingsRequest]);

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

	const handleClone = useCallback(async (): Promise<void> => {
		if (!dashboard.id) {
			return;
		}
		try {
			setIsCloning(true);
			const response = await cloneDashboardV2({ id: dashboard.id });
			toast.success('Dashboard cloned');
			void logEvent(DashboardDetailEvents.Cloned, {
				dashboardId: dashboard.id,
				dashboardName: title,
				source: 'detail',
			});
			safeNavigate(
				generatePath(ROUTES.DASHBOARD, { dashboardId: response.data.id }),
			);
		} catch (error) {
			showErrorModal(error as APIError);
		} finally {
			setIsCloning(false);
		}
	}, [dashboard.id, title, safeNavigate, showErrorModal]);

	const handleConfirmDelete = useCallback((): void => {
		deleteDashboardMutation.mutate(undefined, {
			onSuccess: () => {
				void logEvent(DashboardDetailEvents.Deleted, {
					dashboardId: dashboard.id,
					panelCount: Object.keys(dashboard.spec.panels).length,
				});
				setIsDeleteOpen(false);
				history.replace(ROUTES.ALL_DASHBOARD);
			},
		});
	}, [deleteDashboardMutation, dashboard.id, dashboard.spec.panels]);

	const handleOpenSettings = useCallback((): void => {
		void logEvent(DashboardDetailEvents.SettingsOpened, {
			dashboardId: dashboard.id,
		});
		setIsSettingsDrawerOpen(true);
	}, [dashboard.id]);

	const handleOpenJsonEditor = useCallback((): void => {
		void logEvent(DashboardDetailEvents.JsonEditorOpened, {
			dashboardId: dashboard.id,
			readOnly: !isEditable,
		});
		setIsJsonEditorOpen(true);
	}, [dashboard.id, isEditable]);

	const handleEnterFullScreen = useCallback((): void => {
		void logEvent(DashboardDetailEvents.FullScreenToggled, {
			dashboardId: dashboard.id,
			enabled: true,
		});
		void handle.enter();
	}, [dashboard.id, handle]);

	// Shown only to edit-permitted users, so the only disabled reason is the lock.
	const editLabel = useCallback(
		(text: string): ReactNode =>
			isLocked ? (
				<DisabledMenuItemLabel reason={DASHBOARD_LOCKED_REASON}>
					{text}
				</DisabledMenuItemLabel>
			) : (
				text
			),
		[isLocked],
	);

	const menuItems = useMemo<MenuItem[]>(() => {
		const dashboardGroup: MenuItem[] = [];
		if (canEditDashboard) {
			dashboardGroup.push({
				key: 'rename',
				label: editLabel('Rename'),
				icon: <PenLine size={14} />,
				disabled: isLocked,
				onClick: onOpenRename,
			});
			// Clone creates a new dashboard, so it's not lock-gated.
			dashboardGroup.push({
				key: 'clone',
				label: 'Clone dashboard',
				icon: <Copy size={14} />,
				disabled: isCloning,
				onClick: (): void => void handleClone(),
			});
		}
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
			onClick: handleEnterFullScreen,
		});

		const items: MenuItem[] = [
			{
				type: 'group',
				key: 'group-dashboard',
				label: 'Dashboard',
				children: dashboardGroup,
			},
		];
		// Omit the whole Layout group (header included) in view mode.
		if (canEditDashboard) {
			items.push({
				type: 'group',
				key: 'group-layout',
				label: 'Layout',
				children: [
					{
						key: 'new-section',
						label: editLabel('New section'),
						icon: <SquareStack size={14} />,
						disabled: isLocked,
						onClick: (): void => setIsNewSectionOpen(true),
					},
				],
			});
			items.push(
				{ type: 'divider', key: 'divider-danger' },
				{
					key: 'delete',
					label: editLabel('Delete dashboard'),
					icon: <Trash2 size={14} />,
					danger: true,
					disabled: isLocked,
					onClick: (): void => setIsDeleteOpen(true),
				},
			);
		}
		return items;
	}, [
		editLabel,
		canEditDashboard,
		isLocked,
		isCloning,
		isAuthor,
		user.role,
		isDashboardLocked,
		dashboard.createdBy,
		onOpenRename,
		handleClone,
		onLockToggle,
		handleEnterFullScreen,
	]);

	return (
		<div className={styles.dashboardActionsContainer}>
			<DropdownMenuSimple menu={{ items: menuItems }}>
				<Button
					variant="solid"
					color="secondary"
					size="md"
					className={styles.toolbarButton}
					prefix={<Grid3X3 size="md" />}
					testId="options"
				>
					Actions
				</Button>
			</DropdownMenuSimple>
			{canEditDashboard && (
				<>
					<DisabledControlTooltip
						reason={DASHBOARD_LOCKED_REASON}
						disabled={isLocked}
					>
						<Button
							variant="solid"
							color="secondary"
							className={styles.toolbarButton}
							prefix={<Configure size="md" />}
							testId="show-drawer"
							disabled={isLocked}
							onClick={handleOpenSettings}
							size="md"
						>
							Configure
						</Button>
					</DisabledControlTooltip>
					<SettingsDrawer
						drawerTitle="Dashboard Configuration"
						isOpen={isSettingsDrawerOpen}
						destroyOnClose
						onClose={(): void => {
							setIsSettingsDrawerOpen(false);
							clearSettingsRequest();
						}}
					>
						<DashboardSettings dashboard={dashboard} />
					</SettingsDrawer>
				</>
			)}
			<Button
				variant="solid"
				color="secondary"
				className={styles.toolbarButton}
				prefix={<Braces size="md" />}
				testId="edit-json"
				onClick={handleOpenJsonEditor}
				size="md"
			>
				JSON
			</Button>
			{canEditDashboard && (
				<DisabledControlTooltip
					reason={DASHBOARD_LOCKED_REASON}
					disabled={isLocked}
				>
					<Button
						variant="solid"
						color="primary"
						onClick={onAddPanel}
						prefix={<Plus size="md" />}
						testId="add-panel-header"
						disabled={isLocked}
						size="md"
					>
						New Panel
					</Button>
				</DisabledControlTooltip>
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
