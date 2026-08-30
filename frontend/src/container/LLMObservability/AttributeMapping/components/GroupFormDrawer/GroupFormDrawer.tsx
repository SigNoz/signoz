import { Button } from '@signozhq/ui/button';
import { DrawerWrapper } from '@signozhq/ui/drawer';
import { Input } from '@signozhq/ui/input';
import { Switch } from '@signozhq/ui/switch';

import ConditionKeyList from './components/ConditionKeyList/ConditionKeyList';
import styles from './GroupFormDrawer.module.scss';
import { GroupDraft, MapperDraftMode } from '../../types';
import { isGroupDraftValid } from '../../utils';

interface GroupFormDrawerProps {
	isOpen: boolean;
	mode: MapperDraftMode;
	draft: GroupDraft;
	setDraft: (next: GroupDraft) => void;
	onClose: () => void;
	onSave: () => void;
}

function GroupFormDrawer({
	isOpen,
	mode,
	draft,
	setDraft,
	onClose,
	onSave,
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
			title={isEdit ? 'Edit Group' : 'New Group'}
			subTitle="A group gates which spans its mappings run on"
			width="wide"
			testId="group-form-drawer"
			footer={
				<div className={styles.groupFormFooter}>
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
						disabled={!isValid}
						testId="group-form-save"
					>
						{isEdit ? 'Save Group' : 'Create Group'}
					</Button>
				</div>
			}
		>
			<div className={styles.groupForm}>
				<section className={styles.groupFormSection}>
					<div className={styles.groupFormField}>
						<span className={styles.groupFormLabel}>Group Name</span>
						<Input
							placeholder="e.g. OpenAI Gateway"
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
				</section>

				<section className={styles.groupFormSection}>
					<div className={styles.groupFormSectionHead}>
						<span className={styles.groupFormLabel}>Conditions</span>
						<span className={styles.groupFormHint}>
							Runs when either list matches. Leave both empty to run this group on
							every span.
						</span>
					</div>

					<ConditionKeyList
						label="Span Attribute Keys"
						labelHint="Runs when a span attribute key contains any of these"
						keys={draft.attributes}
						placeholder="e.g. gen_ai."
						addLabel="Add attribute key"
						testIdPrefix="group-form-attribute"
						onChange={(attributes): void => setDraft({ ...draft, attributes })}
					/>

					<ConditionKeyList
						label="Resource Keys"
						labelHint="Runs when a resource key contains any of these"
						keys={draft.resource}
						placeholder="e.g. service.name"
						addLabel="Add resource key"
						testIdPrefix="group-form-resource"
						onChange={(resource): void => setDraft({ ...draft, resource })}
					/>
				</section>
			</div>
		</DrawerWrapper>
	);
}

export default GroupFormDrawer;
