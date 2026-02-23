import { useCallback, useState } from 'react';
import { Select, Tooltip } from 'antd';

import './EmailTagInput.styles.scss';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

	return (
		<div className="email-tag-input">
			<Tooltip
				title={validationError}
				open={!!validationError}
				placement="topRight"
			>
				<Select
					mode="tags"
					value={value}
					onChange={handleChange}
					placeholder={placeholder}
					tokenSeparators={[',', ' ']}
					className="email-tag-input__select"
					allowClear
					status={validationError ? 'error' : undefined}
				/>
			</Tooltip>
		</div>
	);
}

export default EmailTagInput;
