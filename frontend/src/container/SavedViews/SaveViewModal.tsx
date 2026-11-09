import { FormEvent, useRef, useState } from 'react';
import { Check, X } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Dialog } from '@signozhq/ui/dialog';
import { Input } from '@signozhq/ui/input';
import { Typography } from '@signozhq/ui/typography';

import { SAVE_VIEW_MODAL_TITLE } from './constants';
import { SaveViewModalProps } from './types';

import styles from './SaveViewModal.module.scss';

const NAME_INPUT_ID = 'save-view-name';
const FORM_ID = 'save-view-form';

function SaveViewModal({
	mode,
	initialName = '',
	isSaving,
	onClose,
	onSave,
}: SaveViewModalProps): JSX.Element {
	const [name, setName] = useState(initialName);
	const nameInputRef = useRef<HTMLInputElement>(null);
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
		<Dialog
			open
			onClose={onClose}
			title={SAVE_VIEW_MODAL_TITLE[mode]}
			testId="save-view-modal"
			initialFocus={nameInputRef}
			footerSuffix={
				<>
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
						variant="solid"
						color="primary"
						size="md"
						type="submit"
						form={FORM_ID}
						prefix={<Check size={14} />}
						loading={isSaving}
						disabled={!displayName}
						disabledTooltip="Enter a view name"
						testId="save-view-submit"
					>
						Save view
					</Button>
				</>
			}
		>
			<form id={FORM_ID} className={styles.field} onSubmit={handleSubmit}>
				<label htmlFor={NAME_INPUT_ID}>
					<Typography.Text className={styles.label}>Enter view name</Typography.Text>
				</label>
				<Input
					ref={nameInputRef}
					id={NAME_INPUT_ID}
					placeholder="Eg. payments-view"
					value={name}
					onChange={(event): void => setName(event.target.value)}
					autoComplete="off"
					testId="save-view-name"
				/>
			</form>
		</Dialog>
	);
}

export default SaveViewModal;
