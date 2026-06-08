import { useEffect, useMemo, useState } from 'react';
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
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';

import DashboardHeader from '../components/DashboardHeader/DashboardHeader';
import DashboardActions from './DashboardActions/DashboardActions';
import DashboardMeta from './DashboardMeta/DashboardMeta';
import DashboardTitle from './DashboardTitle/DashboardTitle';
import RenameDashboardModal from './RenameDashboardModal/RenameDashboardModal';

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

	const isAuthor =
		!!user?.email && !!dashboard.createdBy && dashboard.createdBy === user.email;
	const addPanelPermission = !isDashboardLocked;
	// V2 public dashboard wiring lives separately; treat as not-public for chrome.
	const isPublicDashboard = false;

	const [isRenameDashboardOpen, setIsRenameDashboardOpen] =
		useState<boolean>(false);
	const [updatedTitle, setUpdatedTitle] = useState<string>(title);
	const [isRenameLoading, setIsRenameLoading] = useState<boolean>(false);

	useEffect(() => {
		setUpdatedTitle(title);
	}, [title]);

	const handleLockDashboardToggle = async (): Promise<void> => {
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
	};

	const onNameChangeHandler = async (): Promise<void> => {
		const trimmed = updatedTitle.trim();
		if (!id || !trimmed || trimmed === title) {
			setIsRenameDashboardOpen(false);
			return;
		}
		try {
			setIsRenameLoading(true);
			const patch: DashboardtypesJSONPatchOperationDTO[] = [
				{
					op: 'replace' as DashboardtypesJSONPatchOperationDTO['op'],
					path: '/spec/display/name',
					value: trimmed,
				},
			];
			await patchDashboardV2({ id }, patch);
			toast.success('Dashboard renamed successfully');
			setIsRenameDashboardOpen(false);
			refetch();
		} catch (error) {
			showErrorModal(error as APIError);
			setIsRenameDashboardOpen(true);
		} finally {
			setIsRenameLoading(false);
		}
	};

	const onEmptyWidgetHandler = (): void => {
		void logEvent('Dashboard Detail V2: Add new panel clicked', {
			dashboardId: id,
		});
		toast.info('V2 panel editor coming next');
	};

	return (
		<Card className={styles.dashboardDescriptionContainer}>
			<DashboardHeader title={title} image={image} />
			<section className={styles.dashboardDetails}>
				<DashboardTitle
					title={title}
					image={image}
					isPublicDashboard={isPublicDashboard}
					isDashboardLocked={isDashboardLocked}
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
					onOpenRename={(): void => setIsRenameDashboardOpen(true)}
				/>
			</section>
			<DashboardMeta tags={tags} description={description} />

			<RenameDashboardModal
				open={isRenameDashboardOpen}
				value={updatedTitle}
				isLoading={isRenameLoading}
				onChange={setUpdatedTitle}
				onRename={onNameChangeHandler}
				onClose={(): void => setIsRenameDashboardOpen(false)}
			/>
		</Card>
	);
}

export default DashboardDescription;
