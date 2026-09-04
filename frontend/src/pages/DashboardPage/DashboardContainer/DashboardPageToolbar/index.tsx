import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FullScreenHandle } from 'react-full-screen';
import { toast } from '@signozhq/ui/sonner';
import logEvent from 'api/common/logEvent';
import type {
	DashboardtypesGettableDashboardV2DTO,
	DashboardtypesJSONPatchOperationDTO,
} from 'api/generated/services/sigNoz.schemas';
import { resolveDashboardImage } from 'pages/DashboardPage/DashboardContainer/dashboardIcons';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import { DashboardDetailEvents } from 'pages/DashboardPage/constants/events';
import { useDashboardLockPermission } from 'hooks/dashboards/useDashboardLockPermission';
import { useToggleDashboardLock } from 'hooks/dashboards/useToggleDashboardLock';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';
import { getAbsoluteUrl } from 'utils/basePath';

import { useCreatePanel } from '../hooks/useCreatePanel';
import { useOptimisticPatch } from '../hooks/useOptimisticPatch';
import { usePublicDashboardMeta } from '../DashboardSettings/PublicDashboard/usePublicDashboardMeta';
import PanelTypeSelectionModal from '../PanelsAndSectionsLayout/Panel/PanelTypeSelectionModal/PanelTypeSelectionModal';
import DashboardActions from './DashboardActions/DashboardActions';
import DashboardInfo from './DashboardInfo/DashboardInfo';
import { useEditableTitle } from './DashboardInfo/useEditableTitle';
import VariablesBar from '../VariablesBar/VariablesBar';

import styles from './DashboardPageToolbar.module.scss';

interface DashboardPageToolbarProps {
	dashboard: DashboardtypesGettableDashboardV2DTO;
	handle: FullScreenHandle;
}

function DashboardPageToolbar(props: DashboardPageToolbarProps): JSX.Element {
	const { dashboard, handle } = props;

	const id = dashboard.id;

	// Session-local lock state: the toggle appears once locked and persists for the page.
	const [isDashboardLocked, setIsDashboardLocked] = useState(!!dashboard.locked);
	const [showLockToggle, setShowLockToggle] = useState(!!dashboard.locked);
	useEffect(() => {
		setIsDashboardLocked(!!dashboard.locked);
		setShowLockToggle(!!dashboard.locked);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [dashboard.id]);

	const title = dashboard.spec.display.name;
	const description = dashboard.spec.display.description ?? '';
	const image = resolveDashboardImage(dashboard.image);
	const tags = useMemo(
		() =>
			(dashboard.tags ?? []).map((t) =>
				t.key === t.value ? t.key : `${t.key}:${t.value}`,
			),
		[dashboard.tags],
	);

	const { showErrorModal } = useErrorModal();
	const { patchAsync } = useOptimisticPatch();
	const {
		isPickerOpen,
		openPicker,
		closePicker,
		createPanel,
		targetLayoutIndex,
	} = useCreatePanel();

	// dashboard:update plus the backend's creator-or-admin rule; integration-owned
	// dashboards are never toggleable.
	const { canToggleLock, disabledReason: lockDisabledReason } =
		useDashboardLockPermission({
			dashboardId: id,
			createdBy: dashboard.createdBy,
		});

	// Public-sharing meta (deduped react-query read); drives the header globe.
	const { isPublic, publicMeta } = usePublicDashboardMeta(id);
	const publicUrl = getAbsoluteUrl(publicMeta?.publicPath ?? '');

	// Shared with the list's row menu — it owns the API call, the toast and the
	// detail-cache patch; the optimistic local state and this page's event stay here.
	const lockSource = useRef<'menu' | 'header'>('header');
	const { toggleLock } = useToggleDashboardLock({
		dashboardId: id,
		isLocked: isDashboardLocked,
		onSuccess: (locked) => {
			void logEvent(DashboardDetailEvents.LockToggled, {
				dashboardId: id,
				dashboardName: title,
				locked,
				source: lockSource.current,
			});
		},
		onError: (error) => {
			setIsDashboardLocked(isDashboardLocked);
			showErrorModal(error);
		},
	});

	const handleLockDashboardToggle = useCallback(
		(source: 'menu' | 'header'): void => {
			if (!id) {
				return;
			}
			lockSource.current = source;
			const next = !isDashboardLocked;
			setIsDashboardLocked(next);
			if (next) {
				setShowLockToggle(true);
			}
			toggleLock();
		},
		[id, isDashboardLocked, toggleLock],
	);

	const onNameSave = useCallback(
		async (next: string): Promise<void> => {
			if (!id) {
				return;
			}
			try {
				const patch: DashboardtypesJSONPatchOperationDTO[] = [
					{
						op: 'replace' as DashboardtypesJSONPatchOperationDTO['op'],
						path: '/spec/display/name',
						value: next,
					},
				];
				await patchAsync(patch);
				toast.success('Dashboard renamed successfully');
				void logEvent(DashboardDetailEvents.Renamed, {
					dashboardId: id,
					dashboardName: next,
					source: 'inline',
				});
			} catch (error) {
				showErrorModal(error as APIError);
			}
		},
		[id, patchAsync, showErrorModal],
	);

	const { isEditing, draft, setDraft, startEdit, cancel, commit } =
		useEditableTitle({
			value: title,
			onSave: onNameSave,
		});

	const onAddPanel = useCallback((): void => {
		void logEvent('Dashboard Detail V2: Add new panel clicked', {
			dashboardId: id,
		});
		openPicker();
	}, [id, openPicker]);

	return (
		<section className={styles.dashboardPageToolbarContainer}>
			<div className={styles.dashboardInfoWithActions}>
				<DashboardInfo
					title={title}
					image={image}
					tags={tags}
					description={description}
					isPublicDashboard={isPublic}
					publicUrl={publicUrl}
					isDashboardLocked={isDashboardLocked}
					showLockToggle={showLockToggle}
					onToggleLock={
						canToggleLock
							? (): void => handleLockDashboardToggle('header')
							: undefined
					}
					lockDisabledReason={lockDisabledReason}
					isEditing={isEditing}
					draft={draft}
					onDraftChange={setDraft}
					onStartEdit={startEdit}
					onCommit={commit}
					onCancel={cancel}
				/>
				<DashboardActions
					title={title}
					dashboard={dashboard}
					handle={handle}
					isDashboardLocked={isDashboardLocked}
					onAddPanel={onAddPanel}
					onLockToggle={(): void => handleLockDashboardToggle('menu')}
					onOpenRename={startEdit}
				/>
			</div>

			{/* Row 2: the time selector floats top-right (declared first so the
			    variables bar's content wraps around it); the variables bar
			    collapses to one line and, when expanded, wraps full-width under it. */}
			<div className={styles.toolbarRow}>
				<div className={styles.timeCluster}>
					<DateTimeSelectionV2 showAutoRefresh hideShareModal />
				</div>
				<VariablesBar dashboard={dashboard} />
			</div>
			<PanelTypeSelectionModal
				open={isPickerOpen}
				onClose={closePicker}
				onSelect={createPanel}
				defaultLayoutIndex={targetLayoutIndex}
			/>
		</section>
	);
}

export default DashboardPageToolbar;
