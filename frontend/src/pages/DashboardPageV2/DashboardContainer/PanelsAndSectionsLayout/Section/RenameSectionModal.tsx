import { useEffect, useState } from 'react';
import { Modal } from 'antd';
import { Input } from '@signozhq/ui/input';

interface RenameSectionModalProps {
	open: boolean;
	initialValue: string;
	isSaving: boolean;
	onClose: () => void;
	onSubmit: (title: string) => void;
}

function RenameSectionModal({
	open,
	initialValue,
	isSaving,
	onClose,
	onSubmit,
}: RenameSectionModalProps): JSX.Element {
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
			title="Rename section"
			onCancel={onClose}
			onOk={submit}
			okText="Rename"
			okButtonProps={{ disabled: isSaving || !value.trim() }}
			destroyOnClose
		>
			<Input
				testId="rename-section-input"
				autoFocus
				value={value}
				maxLength={120}
				placeholder="Section name"
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

export default RenameSectionModal;
