import { useEffect, useState } from 'react';
import { Button } from '@signozhq/ui/button';
import { DialogWrapper } from '@signozhq/ui/dialog';
import { Input } from '@signozhq/ui/input';

import { DASHBOARD_NAME_MAX_LENGTH } from '../../constants';
import styles from './SectionTitleModal.module.scss';

interface SectionTitleModalProps {
	open: boolean;
	/** Modal heading, e.g. "Rename section" / "New section". */
	heading: string;
	/** Confirm button label, e.g. "Rename" / "Create section". */
	okText: string;
	initialValue: string;
	isSaving: boolean;
	placeholder?: string;
	onClose: () => void;
	onSubmit: (title: string) => void;
}

/** Title-entry modal shared by section create and rename (mirrors RenameDashboardModal). */
function SectionTitleModal({
	open,
	heading,
	okText,
	initialValue,
	isSaving,
	placeholder = 'Section name',
	onClose,
	onSubmit,
}: SectionTitleModalProps): JSX.Element {
	const [value, setValue] = useState<string>(initialValue);

	// Reseed the field each time the modal opens.
	useEffect(() => {
		if (open) {
			setValue(initialValue);
		}
	}, [open, initialValue]);

	// `!isSaving` also guards a second submit (e.g. a double Enter) while a request
	// is in flight — otherwise two sections would be created.
	const canSave = value.trim().length > 0 && !isSaving;

	const submit = (): void => {
		if (!canSave) {
			return;
		}
		onSubmit(value.trim());
	};

	return (
		<DialogWrapper
			title={heading}
			open={open}
			width="narrow"
			onOpenChange={(next): void => {
				if (!next) {
					onClose();
				}
			}}
			footer={
				<div className={styles.footer}>
					<Button
						variant="ghost"
						color="secondary"
						size="md"
						onClick={onClose}
						testId="section-title-cancel"
					>
						Cancel
					</Button>
					<Button
						variant="solid"
						color="primary"
						size="md"
						disabled={!canSave}
						loading={isSaving}
						onClick={submit}
						testId="section-title-submit"
					>
						{okText}
					</Button>
				</div>
			}
		>
			<Input
				testId="section-title-input"
				autoFocus
				value={value}
				maxLength={DASHBOARD_NAME_MAX_LENGTH}
				placeholder={placeholder}
				onChange={(e): void => setValue(e.target.value)}
				onKeyDown={(e): void => {
					if (e.key === 'Enter' && canSave) {
						e.preventDefault();
						submit();
					}
				}}
			/>
		</DialogWrapper>
	);
}

export default SectionTitleModal;
