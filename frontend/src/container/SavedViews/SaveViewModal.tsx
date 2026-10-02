import { FormEvent, useState } from 'react';
import { Check, X } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { DialogWrapper } from '@signozhq/ui/dialog';
import { Input } from '@signozhq/ui/input';
import { Typography } from '@signozhq/ui/typography';

import { SAVE_VIEW_MODAL_TITLE } from './constants';
import { SaveViewModalProps } from './types';

import styles from './SaveViewModal.module.scss';

const NAME_INPUT_ID = 'save-view-name';

function SaveViewModal({
	mode,
	isSaving,
	onClose,
	onSave,
}: SaveViewModalProps): JSX.Element {
	const [name, setName] = useState('');
	const displayName = name.trim();

	const handleSave = async (): Promise<void> => {
		if (!displayName || isSaving) {
			return;
		}
		if (await onSave(displayName)) {
			onClose();
		}
	};

	const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
		event.preventDefault();
		void handleSave();
	};

	return (
		<DialogWrapper
			open
			onOpenChange={(isOpen): void => {
				if (!isOpen) {
					onClose();
				}
			}}
			title={SAVE_VIEW_MODAL_TITLE[mode]}
			testId="save-view-modal"
			footer={
				<div className={styles.footer}>
					<Button
						variant="outlined"
						color="secondary"
						size="md"
						prefix={<X size={14} />}
						onClick={onClose}
						testId="save-view-cancel"
					>
						Cancel
					</Button>
					<Button
						color="primary"
						size="md"
						prefix={<Check size={14} />}
						loading={isSaving}
						disabled={!displayName}
						onClick={(): void => {
							void handleSave();
						}}
						testId="save-view-submit"
					>
						Save view
					</Button>
				</div>
			}
		>
			<form className={styles.field} onSubmit={handleSubmit}>
				<label htmlFor={NAME_INPUT_ID}>
					<Typography.Text className={styles.label}>Enter view name</Typography.Text>
				</label>
				<Input
					id={NAME_INPUT_ID}
					placeholder="Eg. payments-view"
					value={name}
					onChange={(event): void => setName(event.target.value)}
					autoFocus
					autoComplete="off"
					testId="save-view-name"
				/>
			</form>
		</DialogWrapper>
	);
}

export default SaveViewModal;
