import { memo, useCallback, useRef, useState } from 'react';
import { Input, InputRef } from 'antd';
import { IDashboardVariable } from 'types/api/dashboard/getAll';

interface TextboxVariableInputProps {
	variableData: IDashboardVariable;
	handleChange: (inputValue: string) => void;
}

function TextboxVariableInput({
	variableData,
	handleChange,
}: TextboxVariableInputProps): JSX.Element {
	const textboxInputRef = useRef<InputRef>(null);
	const [textboxInputValue, setTextboxInputValue] = useState<string>(
		(variableData.selectedValue?.toString() ||
			variableData.defaultValue?.toString()) ??
			'',
	);

	const handleInputOnChange = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			setTextboxInputValue(event.target.value);
		},
		[setTextboxInputValue],
	);

	const handleInputOnBlur = useCallback(
		(event: React.FocusEvent<HTMLInputElement>): void => {
			const value = event.target.value.trim();
			// If empty, reset to default value
			if (!value && variableData.defaultValue) {
				setTextboxInputValue(variableData.defaultValue.toString());
				handleChange(variableData.defaultValue.toString());
			} else {
				handleChange(value);
			}
		},
		[handleChange, variableData.defaultValue],
	);

	const handleInputOnKeyDown = useCallback(
		(event: React.KeyboardEvent<HTMLInputElement>): void => {
			if (event.key === 'Enter') {
				textboxInputRef.current?.blur();
			}
		},
		[],
	);

	return (
		<Input
			ref={textboxInputRef}
			placeholder="Enter value"
			data-testid={`variable-textbox-${variableData.id}`}
			bordered={false}
			value={textboxInputValue}
			title={textboxInputValue}
			onChange={handleInputOnChange}
			onBlur={handleInputOnBlur}
			onKeyDown={handleInputOnKeyDown}
		/>
	);
}

export default memo(TextboxVariableInput);
