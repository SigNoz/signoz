import { Button } from '@signozhq/ui/button';
import { DrawerWrapper } from '@signozhq/ui/drawer';
import { Input } from '@signozhq/ui/input';
import { ArrowDown, ArrowUp, Plus, Trash2, X } from '@signozhq/icons';

import { MapperDraft, MapperDraftMode } from './types';
import { isMapperDraftValid } from './utils';

import './MapperFormDrawer.styles.scss';

interface MapperFormDrawerProps {
	isOpen: boolean;
	mode: MapperDraftMode;
	draft: MapperDraft;
	setDraft: (next: MapperDraft) => void;
	onClose: () => void;
	onSave: () => void;
	onDelete: () => void;
	isSaving: boolean;
	isDeleting: boolean;
	saveError: string | null;
}

function MapperFormDrawer({
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
}: MapperFormDrawerProps): JSX.Element {
	const isEdit = mode === 'edit';
	const isValid = isMapperDraftValid(draft);

	const updateSource = (index: number, value: string): void => {
		const sources = [...draft.sources];
		sources[index] = value;
		setDraft({ ...draft, sources });
	};

	const addSource = (): void => {
		setDraft({ ...draft, sources: [...draft.sources, ''] });
	};

	const removeSource = (index: number): void => {
		const sources = draft.sources.filter((_, i) => i !== index);
		setDraft({ ...draft, sources: sources.length > 0 ? sources : [''] });
	};

	const moveSource = (index: number, direction: -1 | 1): void => {
		const target = index + direction;
		if (target < 0 || target >= draft.sources.length) {
			return;
		}
		const sources = [...draft.sources];
		[sources[index], sources[target]] = [sources[target], sources[index]];
		setDraft({ ...draft, sources });
	};

	return (
		<DrawerWrapper
			open={isOpen}
			onOpenChange={(open): void => {
				if (!open) {
					onClose();
				}
			}}
			title={isEdit ? 'Edit mapping' : 'New custom mapping'}
			subTitle="Map source attributes onto a canonical target attribute"
			testId="mapper-form-drawer"
			footer={
				<div className="mapper-form__footer">
					{isEdit && (
						<Button
							variant="ghost"
							color="destructive"
							prefix={<Trash2 size={14} />}
							onClick={onDelete}
							disabled={isDeleting}
							testId="mapper-form-delete"
						>
							{isDeleting ? 'Deleting…' : 'Delete'}
						</Button>
					)}
					<div className="mapper-form__footer-actions">
						<Button
							variant="ghost"
							color="secondary"
							onClick={onClose}
							testId="mapper-form-cancel"
						>
							Cancel
						</Button>
						<Button
							variant="solid"
							color="primary"
							onClick={onSave}
							disabled={!isValid || isSaving}
							testId="mapper-form-save"
						>
							{/* eslint-disable-next-line no-nested-ternary */}
							{isSaving ? 'Saving…' : isEdit ? 'Save mapping' : 'Create mapping'}
						</Button>
					</div>
				</div>
			}
		>
			<div className="mapper-form">
				<div className="mapper-form__field">
					<span className="mapper-form__label">Target attribute</span>
					<Input
						placeholder="e.g. gen_ai.content.prompt"
						value={draft.name}
						disabled={isEdit}
						onChange={(event): void =>
							setDraft({ ...draft, name: event.target.value })
						}
						testId="mapper-form-target"
					/>
					{isEdit && (
						<span className="mapper-form__hint">
							The target attribute can&apos;t be changed after creation.
						</span>
					)}
				</div>

				<div className="mapper-form__field">
					<span className="mapper-form__label">
						Source attributes
						<span className="mapper-form__label-hint"> · priority: top → bottom</span>
					</span>

					<div className="mapper-form__sources">
						{draft.sources.map((source, index) => (
							// eslint-disable-next-line react/no-array-index-key
							<div className="mapper-form__source" key={index}>
								<span className="mapper-form__source-index">{index + 1}</span>
								<Input
									className="mapper-form__source-input"
									placeholder="Source attribute key"
									value={source}
									onChange={(event): void => updateSource(index, event.target.value)}
									testId={`mapper-form-source-${index}`}
								/>
								<Button
									variant="ghost"
									color="secondary"
									size="sm"
									disabled={index === 0}
									onClick={(): void => moveSource(index, -1)}
									testId={`mapper-form-source-up-${index}`}
								>
									<ArrowUp size={14} />
								</Button>
								<Button
									variant="ghost"
									color="secondary"
									size="sm"
									disabled={index === draft.sources.length - 1}
									onClick={(): void => moveSource(index, 1)}
									testId={`mapper-form-source-down-${index}`}
								>
									<ArrowDown size={14} />
								</Button>
								<Button
									variant="ghost"
									color="secondary"
									size="sm"
									disabled={draft.sources.length === 1}
									onClick={(): void => removeSource(index)}
									testId={`mapper-form-source-remove-${index}`}
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
						onClick={addSource}
						testId="mapper-form-add-source"
					>
						Add another source
					</Button>
				</div>

				{saveError && (
					<div className="mapper-form__error" role="alert">
						{saveError}
					</div>
				)}
			</div>
		</DrawerWrapper>
	);
}

export default MapperFormDrawer;
