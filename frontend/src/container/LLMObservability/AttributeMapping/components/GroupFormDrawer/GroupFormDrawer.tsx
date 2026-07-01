import { Button } from '@signozhq/ui/button';
import { DrawerWrapper } from '@signozhq/ui/drawer';
import { Input } from '@signozhq/ui/input';
import { Switch } from '@signozhq/ui/switch';
import { Trash2 } from '@signozhq/icons';

import ConditionKeyList from './ConditionKeyList';
import styles from './GroupFormDrawer.module.scss';
import { FieldContext, GroupDraft, MapperDraftMode } from '../../types';
import { isGroupDraftValid } from '../../utils';

interface GroupFormDrawerProps {
	isOpen: boolean;
	mode: MapperDraftMode;
	draft: GroupDraft;
	setDraft: (next: GroupDraft) => void;
	onClose: () => void;
	onSave: () => void;
	onDelete: () => void;
	isSaving: boolean;
	isDeleting: boolean;
	saveError: string | null;
}

function GroupFormDrawer({
	isOpen,
	mode,
	draft,
	setDraft,
	onClose,
	onSave,
	onDelete,
	isSaving,
	isDeleting,
	saveError,
}: GroupFormDrawerProps): JSX.Element {
	const isEdit = mode === 'edit';
	const isValid = isGroupDraftValid(draft);

	return (
		<DrawerWrapper
			open={isOpen}
			onOpenChange={(open): void => {
				if (!open) {
					onClose();
				}
			}}
			title={isEdit ? 'Edit group' : 'New group'}
			subTitle="A group gates which spans its mappings run on"
			width="wide"
			testId="group-form-drawer"
			footer={
				<div className={styles.groupFormFooter}>
					{isEdit && (
						<Button
							variant="ghost"
							color="destructive"
							prefix={<Trash2 size={14} />}
							onClick={onDelete}
							disabled={isDeleting}
							testId="group-form-delete"
						>
							{isDeleting ? 'Deleting…' : 'Delete'}
						</Button>
					)}
					<div className={styles.groupFormFooterActions}>
						<Button
							variant="ghost"
							color="secondary"
							onClick={onClose}
							testId="group-form-cancel"
						>
							Cancel
						</Button>
						<Button
							variant="solid"
							color="primary"
							onClick={onSave}
							disabled={!isValid || isSaving}
							testId="group-form-save"
						>
							{/* eslint-disable-next-line no-nested-ternary */}
							{isSaving ? 'Saving…' : isEdit ? 'Save group' : 'Create group'}
						</Button>
					</div>
				</div>
			}
		>
			<div className={styles.groupForm}>
				<div className={styles.groupFormField}>
					<span className={styles.groupFormLabel}>Group name</span>
					<Input
						placeholder="e.g. OpenAI gateway"
						value={draft.name}
						onChange={(event): void =>
							setDraft({ ...draft, name: event.target.value })
						}
						testId="group-form-name"
					/>
				</div>

				<div className={`${styles.groupFormField} ${styles.groupFormFieldRow}`}>
					<span className={styles.groupFormLabel}>Enabled</span>
					<Switch
						value={draft.enabled}
						onChange={(checked): void => setDraft({ ...draft, enabled: checked })}
						testId="group-form-enabled"
					/>
				</div>

				<ConditionKeyList
					label="Condition · span attribute keys"
					labelHint="· runs when a span attribute key contains any of these"
					keys={draft.attributes}
					placeholder="e.g. gen_ai."
					addLabel="Add attribute key"
					testIdPrefix="group-form-attribute"
					fieldContext={FieldContext.attribute}
					onChange={(attributes): void => setDraft({ ...draft, attributes })}
				/>

				<ConditionKeyList
					label="Condition · resource keys"
					labelHint="· or when a resource key contains any of these"
					keys={draft.resource}
					placeholder="e.g. service.name"
					addLabel="Add resource key"
					testIdPrefix="group-form-resource"
					fieldContext={FieldContext.resource}
					onChange={(resource): void => setDraft({ ...draft, resource })}
				/>

				<span className={styles.groupFormHint}>
					Leave both empty to run this group on every span.
				</span>

				{saveError && (
					<div className={styles.groupFormError} role="alert">
						{saveError}
					</div>
				)}
			</div>
		</DrawerWrapper>
	);
}

export default GroupFormDrawer;
