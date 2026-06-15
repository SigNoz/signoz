import { Button } from '@signozhq/ui/button';
import { DrawerWrapper } from '@signozhq/ui/drawer';
import { Input } from '@signozhq/ui/input';
import { Switch } from '@signozhq/ui/switch';
import { Plus, Trash2, X } from '@signozhq/icons';

import { GroupDraft, MapperDraftMode } from './types';
import { isGroupDraftValid } from './utils';

import './GroupFormDrawer.styles.scss';

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

	const updateAttribute = (index: number, value: string): void => {
		const attributes = [...draft.attributes];
		attributes[index] = value;
		setDraft({ ...draft, attributes });
	};

	const addAttribute = (): void => {
		setDraft({ ...draft, attributes: [...draft.attributes, ''] });
	};

	const removeAttribute = (index: number): void => {
		const attributes = draft.attributes.filter((_, i) => i !== index);
		setDraft({ ...draft, attributes: attributes.length > 0 ? attributes : [''] });
	};

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
			testId="group-form-drawer"
			footer={
				<div className="group-form__footer">
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
					<div className="group-form__footer-actions">
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
			<div className="group-form">
				<div className="group-form__field">
					<span className="group-form__label">Group name</span>
					<Input
						placeholder="e.g. OpenAI gateway"
						value={draft.name}
						onChange={(event): void =>
							setDraft({ ...draft, name: event.target.value })
						}
						testId="group-form-name"
					/>
				</div>

				<div className="group-form__field group-form__field--row">
					<span className="group-form__label">Enabled</span>
					<Switch
						value={draft.enabled}
						onChange={(checked): void => setDraft({ ...draft, enabled: checked })}
						testId="group-form-enabled"
					/>
				</div>

				<div className="group-form__field">
					<span className="group-form__label">
						Condition · attribute keys
						<span className="group-form__label-hint">
							{' '}
							· group runs when a span attribute contains any of these
						</span>
					</span>

					<div className="group-form__keys">
						{draft.attributes.map((attribute, index) => (
							// eslint-disable-next-line react/no-array-index-key
							<div className="group-form__key" key={index}>
								<Input
									className="group-form__key-input"
									placeholder="e.g. gen_ai."
									value={attribute}
									onChange={(event): void => updateAttribute(index, event.target.value)}
									testId={`group-form-attribute-${index}`}
								/>
								<Button
									variant="ghost"
									color="secondary"
									size="sm"
									disabled={draft.attributes.length === 1}
									onClick={(): void => removeAttribute(index)}
									testId={`group-form-attribute-remove-${index}`}
								>
									<X size={14} />
								</Button>
							</div>
						))}
					</div>

					<Button
						variant="dashed"
						color="secondary"
						prefix={<Plus size={14} />}
						onClick={addAttribute}
						testId="group-form-add-attribute"
					>
						Add attribute key
					</Button>
					<span className="group-form__hint">
						Leave empty to run this group on every span.
					</span>
				</div>

				{saveError && (
					<div className="group-form__error" role="alert">
						{saveError}
					</div>
				)}
			</div>
		</DrawerWrapper>
	);
}

export default GroupFormDrawer;
