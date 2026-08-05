import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { Button } from '@signozhq/ui/button';
import { DialogWrapper } from '@signozhq/ui/dialog';
import { toast } from '@signozhq/ui/sonner';
import logEvent from 'api/common/logEvent';
import {
	invalidateListDashboardsForUserV2,
	// eslint-disable-next-line no-restricted-imports -- list tag-edit targets another dashboard by id; useOptimisticPatch is bound to the open dashboard's store/cache.
	patchDashboardV2,
} from 'api/generated/services/dashboard';
import type { DashboardtypesJSONPatchOperationDTO } from 'api/generated/services/sigNoz.schemas';
import TagKeyValueInput from 'components/TagKeyValueInput/TagKeyValueInput';
import { DashboardListEvents } from 'pages/DashboardsListPageV2/constants/events';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';

import { keyValueStringsToTags } from '../../utils/helpers';
import styles from './ActionsPopover.module.scss';

interface Props {
	open: boolean;
	dashboardId: string;
	// Current tags as `key:value` strings.
	currentTags: string[];
	onClose: () => void;
}

/**
 * Edits a dashboard's tags from the list via an `add /tags` patch, then refreshes
 * the list. `add` is used (not `replace`) so it works whether the tags field is
 * already present or absent on the stored dashboard.
 */
function EditTagsModal({
	open,
	dashboardId,
	currentTags,
	onClose,
}: Props): JSX.Element {
	const [tags, setTags] = useState<string[]>(currentTags);
	const queryClient = useQueryClient();
	const { showErrorModal } = useErrorModal();

	// Reset to the dashboard's tags when the modal opens. Keyed by content
	// (`tagsKey`) rather than array identity, since `currentTags` is a fresh array
	// on each parent render; reconstructing from the key keeps the effect deps
	// stable and the reset off the per-render path.
	const tagsKey = currentTags.join('\n');
	useEffect(() => {
		if (open) {
			setTags(tagsKey ? tagsKey.split('\n') : []);
		}
	}, [open, tagsKey]);

	const { mutate: runSave, isLoading } = useMutation({
		mutationFn: () => {
			const ops: DashboardtypesJSONPatchOperationDTO[] = [
				{
					op: 'add' as DashboardtypesJSONPatchOperationDTO['op'],
					path: '/tags',
					value: keyValueStringsToTags(tags),
				},
			];
			return patchDashboardV2({ id: dashboardId }, ops);
		},
		onSuccess: async () => {
			toast.success('Tags updated');
			void logEvent(DashboardListEvents.RowAction, {
				action: 'editTags',
				dashboardId,
			});
			await invalidateListDashboardsForUserV2(queryClient);
			onClose();
		},
		onError: (error: APIError) => {
			showErrorModal(error);
		},
	});

	// Save on Cmd/Ctrl+Enter from anywhere in the modal (not just the tag input),
	// while it is open.
	useEffect(() => {
		if (!open) {
			return undefined;
		}
		const onKeyDown = (e: KeyboardEvent): void => {
			if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
				e.preventDefault();
				runSave();
			}
		};
		window.addEventListener('keydown', onKeyDown);
		return (): void => window.removeEventListener('keydown', onKeyDown);
	}, [open, runSave]);

	const title = currentTags.length > 0 ? 'Edit tags' : 'Add tags';

	return (
		<DialogWrapper
			title={title}
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
						testId="edit-tags-cancel"
					>
						Cancel
					</Button>
					<Button
						variant="solid"
						color="primary"
						size="md"
						loading={isLoading}
						disabled={isLoading}
						onClick={(): void => runSave()}
						testId="edit-tags-submit"
					>
						Save
					</Button>
				</div>
			}
		>
			<TagKeyValueInput
				tags={tags}
				onTagsChange={setTags}
				placeholder="key:value (press Enter)"
				testId="edit-dashboard-tags"
			/>
		</DialogWrapper>
	);
}

export default EditTagsModal;
