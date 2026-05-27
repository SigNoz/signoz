import { ClipboardEvent, useCallback, useState } from 'react';
import { ComboboxSimple } from '@signozhq/ui/combobox';
import { Tooltip } from 'antd';

import './EmailTagInput.styles.scss';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_SEPARATOR_REGEX = /[,\s]+/;

interface EmailTagInputProps {
	value?: string[];
	onChange?: (value: string[]) => void;
	placeholder?: string;
}

function EmailTagInput({
	value = [],
	onChange,
	placeholder = 'Type an email and press Enter',
}: EmailTagInputProps): JSX.Element {
	const [validationError, setValidationError] = useState('');

	const handleChange = useCallback(
		(newValues: string[]): void => {
			const addedValues = newValues.filter((v) => !value.includes(v));
			const invalidEmail = addedValues.find((v) => !EMAIL_REGEX.test(v));

			if (invalidEmail) {
				setValidationError(`"${invalidEmail}" is not a valid email`);
				return;
			}
			setValidationError('');
			onChange?.(newValues);
		},
		[onChange, value],
	);

	// Replicates antd `tokenSeparators={[',', ' ']}` for pasted text.
	// ComboboxSimple has no native equivalent, so split the clipboard
	// payload here and merge into the existing values.
	const handlePaste = useCallback(
		(event: ClipboardEvent<HTMLDivElement>): void => {
			const pasted = event.clipboardData?.getData('text');
			if (!pasted || !TOKEN_SEPARATOR_REGEX.test(pasted)) {
				return;
			}
			event.preventDefault();
			event.stopPropagation();
			const tokens = pasted
				.split(TOKEN_SEPARATOR_REGEX)
				.map((token) => token.trim())
				.filter(Boolean);
			if (tokens.length === 0) {
				return;
			}
			const merged = Array.from(new Set([...value, ...tokens]));
			handleChange(merged);
		},
		[handleChange, value],
	);

	return (
		<div className="email-tag-input">
			<Tooltip
				title={validationError}
				open={!!validationError}
				placement="topRight"
			>
				<div onPaste={handlePaste}>
					<ComboboxSimple
						multiple
						allowCreate
						items={[]}
						value={value}
						onChange={(v): void => handleChange(v as string[])}
						placeholder={placeholder}
						className="email-tag-input__select"
					/>
				</div>
			</Tooltip>
		</div>
	);
}

export default EmailTagInput;
