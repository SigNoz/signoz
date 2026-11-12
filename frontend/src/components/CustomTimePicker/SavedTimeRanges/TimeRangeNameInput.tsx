import { KeyboardEvent, useState } from 'react';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import { Check, X } from '@signozhq/icons';
import { MAX_SAVED_TIME_RANGE_NAME_LENGTH } from 'utils/savedTimeRangeUtils';

import styles from './SavedTimeRanges.module.scss';

interface TimeRangeNameInputProps {
	initialName?: string;
	onSubmit: (name: string) => void;
	onCancel: () => void;
}

function TimeRangeNameInput({
	initialName = '',
	onSubmit,
	onCancel,
}: TimeRangeNameInputProps): JSX.Element {
	const [name, setName] = useState(initialName);
	const isNameEmpty = name.trim() === '';

	const handleSubmit = (): void => {
		if (!isNameEmpty) {
			onSubmit(name);
		}
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
		e.stopPropagation();
		if (e.key === 'Enter') {
			handleSubmit();
		}
		if (e.key === 'Escape') {
			onCancel();
		}
	};

	return (
		<div className={styles.nameInput}>
			<Input
				className={styles.nameInputField}
				testId="saved-time-range-name-input"
				value={name}
				placeholder="Name this time range"
				maxLength={MAX_SAVED_TIME_RANGE_NAME_LENGTH}
				autoFocus
				onChange={(e): void => setName(e.target.value)}
				onKeyDown={handleKeyDown}
			/>
			<Button
				variant="ghost"
				color="secondary"
				size="sm"
				icon
				testId="saved-time-range-name-submit"
				aria-label="Save name"
				disabled={isNameEmpty}
				disabledTooltip="Name cannot be empty"
				onClick={handleSubmit}
			>
				<Check size={14} />
			</Button>
			<Button
				variant="ghost"
				color="secondary"
				size="sm"
				icon
				testId="saved-time-range-name-cancel"
				aria-label="Cancel"
				onClick={onCancel}
			>
				<X size={14} />
			</Button>
		</div>
	);
}

export default TimeRangeNameInput;
