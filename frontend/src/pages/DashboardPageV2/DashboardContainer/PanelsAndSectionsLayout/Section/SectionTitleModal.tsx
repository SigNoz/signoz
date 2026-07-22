import { useEffect, useState } from 'react';
import { Modal } from 'antd';
import { Input } from '@signozhq/ui/input';

import { DASHBOARD_NAME_MAX_LENGTH } from '../../constants';

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

/** Title-entry modal shared by section create and rename. */
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

	const submit = (): void => {
		const trimmed = value.trim();
		if (trimmed) {
			onSubmit(trimmed);
		}
	};

	return (
		<Modal
			open={open}
			title={heading}
			onCancel={onClose}
			onOk={submit}
			okText={okText}
			okButtonProps={{ disabled: isSaving || !value.trim() }}
			destroyOnClose
		>
			<Input
				testId="section-title-input"
				autoFocus
				value={value}
				maxLength={DASHBOARD_NAME_MAX_LENGTH}
				placeholder={placeholder}
				onChange={(e): void => setValue(e.target.value)}
				onKeyDown={(e): void => {
					if (e.key === 'Enter') {
						e.preventDefault();
						submit();
					}
				}}
			/>
		</Modal>
	);
}

export default SectionTitleModal;
