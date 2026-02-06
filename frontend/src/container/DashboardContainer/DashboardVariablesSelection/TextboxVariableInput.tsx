import { memo, useCallback, useRef, useState } from 'react';
import { Input, InputRef } from 'antd';

import { VariableItemProps } from './VariableItem';

type TextboxVariableInputProps = Pick<
	VariableItemProps,
	'variableData' | 'onValueUpdate'
>;

function TextboxVariableInput({
	variableData,
	onValueUpdate,
}: TextboxVariableInputProps): JSX.Element {
	const handleChange = useCallback(
		(inputValue: string | string[]): void => {
			if (inputValue === variableData.selectedValue) {
				return;
			}
			if (variableData.name) {
				onValueUpdate(variableData.name, variableData.id, inputValue, false);
			}
		},
		[
			onValueUpdate,
			variableData.id,
			variableData.name,
			variableData.selectedValue,
		],
	);

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
			key={variableData.id}
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
