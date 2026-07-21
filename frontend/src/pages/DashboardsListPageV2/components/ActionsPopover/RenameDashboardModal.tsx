import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { Button } from '@signozhq/ui/button';
import { DialogWrapper } from '@signozhq/ui/dialog';
import { Input } from '@signozhq/ui/input';
import { toast } from '@signozhq/ui/sonner';
import logEvent from 'api/common/logEvent';
import {
	invalidateListDashboardsForUserV2,
	// eslint-disable-next-line no-restricted-imports -- list rename targets another dashboard by id; useOptimisticPatch is bound to the open dashboard's store/cache.
	patchDashboardV2,
} from 'api/generated/services/dashboard';
import type { DashboardtypesJSONPatchOperationDTO } from 'api/generated/services/sigNoz.schemas';
import { DashboardListEvents } from 'pages/DashboardsListPageV2/constants/events';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';

import { DASHBOARD_NAME_MAX_LENGTH } from '../../../DashboardPageV2/DashboardContainer/constants';
import styles from './ActionsPopover.module.scss';

interface Props {
	open: boolean;
	dashboardId: string;
	currentName: string;
	onClose: () => void;
}

/** Renames a dashboard from the list via a `/spec/display/name` patch, then refreshes the list. */
function RenameDashboardModal({
	open,
	dashboardId,
	currentName,
	onClose,
}: Props): JSX.Element {
	const [name, setName] = useState(currentName);
	const queryClient = useQueryClient();
	const { showErrorModal } = useErrorModal();

	// Reset the field to the current name whenever the modal (re)opens.
	useEffect(() => {
		if (open) {
			setName(currentName);
		}
	}, [open, currentName]);

	const { mutate: runRename, isLoading } = useMutation({
		mutationFn: () => {
			const ops: DashboardtypesJSONPatchOperationDTO[] = [
				{
					op: 'replace' as DashboardtypesJSONPatchOperationDTO['op'],
					path: '/spec/display/name',
					value: name.trim(),
				},
			];
			return patchDashboardV2({ id: dashboardId }, ops);
		},
		onSuccess: async () => {
			toast.success('Dashboard renamed');
			void logEvent(DashboardListEvents.RowAction, {
				action: 'rename',
				dashboardId,
			});
			await invalidateListDashboardsForUserV2(queryClient);
			onClose();
		},
		onError: (error: APIError) => {
			showErrorModal(error);
		},
	});

	const trimmed = name.trim();
	const canSave = trimmed.length > 0 && trimmed !== currentName && !isLoading;

	return (
		<DialogWrapper
			title="Rename dashboard"
			open={open}
			width="narrow"
			onOpenChange={(next): void => {
				if (!next) {
					onClose();
				}
			}}
			footer={
				<div className={styles.renameFooter}>
					<Button
						variant="ghost"
						color="secondary"
						size="md"
						onClick={onClose}
						testId="rename-dashboard-cancel"
					>
						Cancel
					</Button>
					<Button
						variant="solid"
						color="primary"
						size="md"
						disabled={!canSave}
						loading={isLoading}
						onClick={(): void => runRename()}
						testId="rename-dashboard-submit"
					>
						Save
					</Button>
				</div>
			}
		>
			<Input
				value={name}
				autoFocus
				maxLength={DASHBOARD_NAME_MAX_LENGTH}
				placeholder="Dashboard name"
				testId="rename-dashboard-input"
				onChange={(e): void => setName(e.target.value)}
				onKeyDown={(e): void => {
					if (e.key === 'Enter' && canSave) {
						runRename();
					}
				}}
			/>
		</DialogWrapper>
	);
}

export default RenameDashboardModal;
