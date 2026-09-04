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
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { DashboardDetailEvents } from 'pages/DashboardPage/constants/events';
import {
	DASHBOARD_CLONE_DENIED_REASON,
	DASHBOARD_NO_CREATE_PERMISSION_REASON,
} from 'hooks/dashboards/dashboardPermissionReasons';
import { useDashboardCollectionPermissions } from 'hooks/dashboards/useDashboardCollectionPermissions';
import { useDashboardLockPermission } from 'hooks/dashboards/useDashboardLockPermission';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';

import DisabledControlTooltip from '../../components/DisabledControlTooltip/DisabledControlTooltip';
import DisabledMenuItemLabel from '../../components/DisabledMenuItemLabel/DisabledMenuItemLabel';
import DashboardSettings from '../../DashboardSettings';
import { useAddSection } from '../../PanelsAndSectionsLayout/Section/hooks/useAddSection';
import SectionTitleModal from '../../PanelsAndSectionsLayout/Section/SectionTitleModal';
import JsonEditorDrawer from '../JsonEditorDrawer/JsonEditorDrawer';
import SettingsDrawer from '../SettingsDrawer';
import styles from './DashboardActions.module.scss';
import { useDeleteDashboardAction } from './useDeleteDashboardAction';
import { useDashboardStore } from '../../store/useDashboardStore';
import { useDashboardEditContext } from '../../hooks/useDashboardEditContext';

interface DashboardActionsProps {
	title: string;
	dashboard: DashboardtypesGettableDashboardV2DTO;
	handle: FullScreenHandle;
	isDashboardLocked: boolean;
	onAddPanel: () => void;
	onLockToggle: () => void;
	onOpenRename: () => void;
}

function DashboardActions({
	title,
	dashboard,
	handle,
	isDashboardLocked,
	onAddPanel,
	onLockToggle,
	onOpenRename,
}: DashboardActionsProps): JSX.Element {
	const {
		isLocked,
		isEditable,
		editDisabledReason,
		editDisabledKind,
		deleteDisabledReason,
		deleteDisabledKind,
		canDeleteDashboard,
		canEditDashboard: canReadDashboard,
	} = useDashboardEditContext();
	const settingsRequest = useDashboardStore((s) => s.settingsRequest);
	const clearSettingsRequest = useDashboardStore((s) => s.clearSettingsRequest);
	const { safeNavigate } = useSafeNavigate();
	const { showErrorModal } = useErrorModal();
	const { canCreate } = useDashboardCollectionPermissions();
	const {
		canToggleLock,
		disabledReason: lockDisabledReason,
		disabledKind: lockDisabledKind,
	} = useDashboardLockPermission({
		dashboardId: dashboard.id,
		createdBy: dashboard.createdBy,
	});

	// Cloning creates a new dashboard from this one, so it needs create as well as
	// the read this page already proves; it is not lock-gated.
	const cloneDisabledReason = canCreate
		? ''
		: (canReadDashboard && DASHBOARD_NO_CREATE_PERMISSION_REASON) ||
			DASHBOARD_CLONE_DENIED_REASON;

	const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] =
		useState<boolean>(false);
	const [isJsonEditorOpen, setIsJsonEditorOpen] = useState<boolean>(false);
	const [isCloning, setIsCloning] = useState<boolean>(false);
	const [isNewSectionOpen, setIsNewSectionOpen] = useState<boolean>(false);

	const { contextHolder: deleteConfirmHolder, confirmDeleteDashboard } =
		useDeleteDashboardAction({
			dashboardId: dashboard.id,
			dashboardName: title,
			panelCount: Object.keys(dashboard.spec.panels).length,
		});

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
			const ok = await addSection(title);
			if (ok) {
				setIsNewSectionOpen(false);
			}
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

	// Items stay in the menu when they aren't available, carrying the reason —
	// lock or missing permission — instead of disappearing.
	const disabledLabel = useCallback(
		(text: string, reason: string, kind: 'denied' | 'blocked'): ReactNode =>
			reason ? (
				<DisabledMenuItemLabel reason={reason} kind={kind}>
					{text}
				</DisabledMenuItemLabel>
			) : (
				text
			),
		[],
	);

	const menuItems = useMemo<MenuItem[]>(() => {
		const dashboardGroup: MenuItem[] = [
			{
				key: 'rename',
				label: disabledLabel('Rename', editDisabledReason, editDisabledKind),
				icon: <PenLine size={14} />,
				disabled: !isEditable,
				onClick: onOpenRename,
			},
			// Clone creates a new dashboard, so it's not lock-gated.
			{
				key: 'clone',
				label: disabledLabel('Clone dashboard', cloneDisabledReason, 'denied'),
				icon: <Copy size={14} />,
				disabled: isCloning || !!cloneDisabledReason,
				onClick: (): void => void handleClone(),
			},
			{
				key: 'lock',
				label: disabledLabel(
					isDashboardLocked ? 'Unlock dashboard' : 'Lock dashboard',
					lockDisabledReason,
					lockDisabledKind,
				),
				icon: <LockKeyhole size={14} />,
				disabled: !canToggleLock,
				onClick: onLockToggle,
			},
			{
				key: 'fullscreen',
				label: 'Full screen',
				icon: <Fullscreen size={14} />,
				onClick: handleEnterFullScreen,
			},
		];

		return [
			{
				type: 'group',
				key: 'group-dashboard',
				label: 'Dashboard',
				children: dashboardGroup,
			},
			{
				type: 'group',
				key: 'group-layout',
				label: 'Layout',
				children: [
					{
						key: 'new-section',
						label: disabledLabel('New section', editDisabledReason, editDisabledKind),
						icon: <SquareStack size={14} />,
						disabled: !isEditable,
						onClick: (): void => setIsNewSectionOpen(true),
					},
				],
			},
			{ type: 'divider', key: 'divider-danger' },
			{
				key: 'delete',
				label: disabledLabel(
					'Delete dashboard',
					deleteDisabledReason,
					deleteDisabledKind,
				),
				icon: <Trash2 size={14} />,
				danger: true,
				// Delete is independent of read/update, but a locked dashboard still
				// can't be removed.
				disabled: isLocked || !canDeleteDashboard,
				onClick: confirmDeleteDashboard,
			},
		];
	}, [
		disabledLabel,
		isEditable,
		isLocked,
		editDisabledReason,
		editDisabledKind,
		deleteDisabledReason,
		deleteDisabledKind,
		canDeleteDashboard,
		cloneDisabledReason,
		isCloning,
		canToggleLock,
		lockDisabledReason,
		isDashboardLocked,
		onOpenRename,
		handleClone,
		onLockToggle,
		handleEnterFullScreen,
		confirmDeleteDashboard,
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
			<DisabledControlTooltip reason={editDisabledReason} kind={editDisabledKind}>
				<Button
					variant="solid"
					color="secondary"
					className={styles.toolbarButton}
					prefix={<Configure size="md" />}
					testId="show-drawer"
					disabled={!isEditable}
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
			<DisabledControlTooltip reason={editDisabledReason} kind={editDisabledKind}>
				<Button
					variant="solid"
					color="primary"
					onClick={onAddPanel}
					prefix={<Plus size="md" />}
					testId="add-panel-header"
					disabled={!isEditable}
					size="md"
				>
					New Panel
				</Button>
			</DisabledControlTooltip>
			<JsonEditorDrawer
				dashboard={dashboard}
				isOpen={isJsonEditorOpen}
				onClose={(): void => setIsJsonEditorOpen(false)}
			/>
			{deleteConfirmHolder}
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
