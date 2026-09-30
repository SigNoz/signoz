import type { KeyboardEvent } from 'react';
import { X } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';

import styles from './NewSectionNameInput.module.scss';

interface NewSectionNameInputProps {
	value: string;
	onChange: (value: string) => void;
	onCancel: () => void;
	onSubmit: () => void;
}

function NewSectionNameInput({
	value,
	onChange,
	onCancel,
	onSubmit,
}: NewSectionNameInputProps): JSX.Element {
	const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
		if (e.key === 'Enter') {
			onSubmit();
		} else if (e.key === 'Escape') {
			// Drop the draft only, not the drawer.
			e.stopPropagation();
			onCancel();
		}
	};

	return (
		<Input
			autoFocus
			value={value}
			placeholder="New section name"
			containerClassName={styles.nameInput}
			onChange={(e): void => onChange(e.target.value)}
			onKeyDown={handleKeyDown}
			testId="panel-section-name"
			suffix={
				<Button
					variant="ghost"
					color="secondary"
					size="icon"
					aria-label="Cancel new section"
					onClick={onCancel}
					testId="panel-section-name-cancel"
				>
					<X size={14} />
				</Button>
			}
		/>
	);
}

export default NewSectionNameInput;
