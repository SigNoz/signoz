import { useCallback, useMemo } from 'react';
import { FullScreenHandle } from 'react-full-screen';
import { Card } from 'antd';
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
import useComponentPermission from 'hooks/useComponentPermission';
import { useAppContext } from 'providers/App/App';
import { usePanelTypeSelectionModalStore } from 'providers/Dashboard/helpers/panelTypeSelectionModalHelper';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';

import DashboardHeader from '../components/DashboardHeader/DashboardHeader';
import DashboardActions from './DashboardActions/DashboardActions';
import DashboardMeta from './DashboardMeta/DashboardMeta';
import DashboardTitle from './DashboardTitle/DashboardTitle';
import { useEditableTitle } from './DashboardTitle/useEditableTitle';

import styles from './DashboardDescription.module.scss';

interface DashboardDescriptionProps {
	dashboard: DashboardtypesGettableDashboardV2DTO;
	handle: FullScreenHandle;
	refetch: () => void;
}

function DashboardDescription(props: DashboardDescriptionProps): JSX.Element {
	const { dashboard, handle, refetch } = props;

	const id = dashboard.id;
	const isDashboardLocked = !!dashboard.locked;

	const title = dashboard.spec?.display?.name ?? '';
	const description = dashboard.spec?.display?.description ?? '';
	const image = dashboard.image || Base64Icons[0];
	const tags = useMemo(
		() =>
			(dashboard.tags ?? []).map((t) =>
				t.key === t.value ? t.key : `${t.key}:${t.value}`,
			),
		[dashboard.tags],
	);

	const { user } = useAppContext();
	const [editDashboard] = useComponentPermission(['edit_dashboard'], user.role);
	const { showErrorModal } = useErrorModal();
	const setIsPanelTypeSelectionModalOpen = usePanelTypeSelectionModalStore(
		(s) => s.setIsPanelTypeSelectionModalOpen,
	);

	const isAuthor =
		!!user?.email && !!dashboard.createdBy && dashboard.createdBy === user.email;
	const addPanelPermission = !isDashboardLocked;
	// V2 public dashboard wiring lives separately; treat as not-public for chrome.
	const isPublicDashboard = false;

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

	const onEmptyWidgetHandler = useCallback((): void => {
		void logEvent('Dashboard Detail V2: Add new panel clicked', {
			dashboardId: id,
		});
		setIsPanelTypeSelectionModalOpen(true);
	}, [id, setIsPanelTypeSelectionModalOpen]);

	return (
		<Card className={styles.dashboardDescriptionContainer}>
			<DashboardHeader title={title} image={image} />
			<section className={styles.dashboardDetails}>
				<DashboardTitle
					title={title}
					image={image}
					isPublicDashboard={isPublicDashboard}
					isDashboardLocked={isDashboardLocked}
					isEditable={editDashboard}
					isEditing={isEditing}
					draft={draft}
					onDraftChange={setDraft}
					onStartEdit={startEdit}
					onCommit={commit}
					onCancel={cancel}
				/>
				<DashboardActions
					dashboard={dashboard}
					handle={handle}
					isDashboardLocked={isDashboardLocked}
					editDashboard={editDashboard}
					isAuthor={isAuthor}
					addPanelPermission={addPanelPermission}
					onAddPanel={onEmptyWidgetHandler}
					onLockToggle={handleLockDashboardToggle}
					onOpenRename={startEdit}
				/>
			</section>
			<DashboardMeta tags={tags} description={description} />
		</Card>
	);
}

export default DashboardDescription;
