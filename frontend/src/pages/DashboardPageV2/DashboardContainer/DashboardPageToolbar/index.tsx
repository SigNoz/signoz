import { useCallback, useMemo } from 'react';
import { FullScreenHandle } from 'react-full-screen';
import { toast } from '@signozhq/ui/sonner';
import logEvent from 'api/common/logEvent';
import {
	lockDashboardV2,
	patchDashboardV2,
	unlockDashboardV2,
} from 'api/generated/services/dashboard';
import type {
	DashboardtypesGettableDashboardV2DTO,
	DashboardtypesJSONPatchOperationDTO,
} from 'api/generated/services/sigNoz.schemas';
import { Base64Icons } from 'container/DashboardContainer/DashboardSettings/General/utils';
import { useAppContext } from 'providers/App/App';
import { usePanelTypeSelectionModalStore } from 'providers/Dashboard/helpers/panelTypeSelectionModalHelper';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';

import DashboardActions from './DashboardActions/DashboardActions';
import DashboardInfo from './DashboardInfo/DashboardInfo';
import { useEditableTitle } from './DashboardInfo/useEditableTitle';
import VariablesBar from '../VariablesBar/VariablesBar';

import styles from './DashboardPageToolbar.module.scss';

interface DashboardPageToolbarProps {
	dashboard: DashboardtypesGettableDashboardV2DTO;
	handle: FullScreenHandle;
	refetch: () => void;
}

function DashboardPageToolbar(props: DashboardPageToolbarProps): JSX.Element {
	const { dashboard, handle, refetch } = props;

	const id = dashboard.id;
	const isDashboardLocked = !!dashboard.locked;

	const title = dashboard.spec.display.name;
	const description = dashboard.spec.display.description ?? '';
	const image = dashboard.image || Base64Icons[0];
	const tags = useMemo(
		() =>
			(dashboard.tags ?? []).map((t) =>
				t.key === t.value ? t.key : `${t.key}:${t.value}`,
			),
		[dashboard.tags],
	);

	const { user } = useAppContext();
	const { showErrorModal } = useErrorModal();
	const setIsPanelTypeSelectionModalOpen = usePanelTypeSelectionModalStore(
		(s) => s.setIsPanelTypeSelectionModalOpen,
	);

	const isAuthor =
		!!user?.email && !!dashboard.createdBy && dashboard.createdBy === user.email;

	const handleLockDashboardToggle = useCallback(async (): Promise<void> => {
		if (!id) {
			return;
		}
		try {
			if (isDashboardLocked) {
				await unlockDashboardV2({ id });
				toast.success('Dashboard unlocked');
			} else {
				await lockDashboardV2({ id });
				toast.success('Dashboard locked');
			}
			refetch();
		} catch (error) {
			showErrorModal(error as APIError);
		}
	}, [id, isDashboardLocked, refetch, showErrorModal]);

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
				await patchDashboardV2({ id }, patch);
				toast.success('Dashboard renamed successfully');
				refetch();
			} catch (error) {
				showErrorModal(error as APIError);
			}
		},
		[id, refetch, showErrorModal],
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
		setIsPanelTypeSelectionModalOpen(true);
	}, [id, setIsPanelTypeSelectionModalOpen]);

	return (
		<section className={styles.dashboardPageToolbarContainer}>
			<div className={styles.dashboardInfoWithActions}>
				<DashboardInfo
					title={title}
					image={image}
					tags={tags}
					description={description}
					isPublicDashboard={false}
					isDashboardLocked={isDashboardLocked}
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
					isAuthor={isAuthor}
					onAddPanel={onAddPanel}
					onLockToggle={handleLockDashboardToggle}
					onOpenRename={startEdit}
				/>
			</div>

			<VariablesBar dashboard={dashboard} />
		</section>
	);
}

export default DashboardPageToolbar;
