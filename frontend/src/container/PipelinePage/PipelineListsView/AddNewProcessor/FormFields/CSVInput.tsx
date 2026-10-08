import { ChangeEventHandler, useState } from 'react';
import { Input } from '@signozhq/ui/input';

interface CSVInputProps {
	// `value` and `onChange` are injected by the surrounding antd <Form.Item>,
	// which stores this field's value as a string array.
	value?: string[];
	onChange?: (value: string[]) => void;
	placeholder?: string;
	// Injected by <Form.Item> to link the label to the control.
	id?: string;
}

function CSVInput({
	value,
	onChange,
	placeholder,
	id,
}: CSVInputProps): JSX.Element {
	const [inputValue, setInputValue] = useState((value || []).join(', '));

	const onInputChange: ChangeEventHandler<HTMLInputElement> = (e) => {
		const newValue = e.target.value;
		setInputValue(newValue);

		if (onChange) {
			const splitValues = newValue.split(',').map((v) => v.trim());
			onChange(splitValues);
		}
	};

	return (
		<Input
			id={id}
			placeholder={placeholder}
			value={inputValue}
			onChange={onInputChange}
		/>
	);
}

CSVInput.defaultProps = {
	value: undefined,
	onChange: undefined,
	placeholder: undefined,
	id: undefined,
};

export default CSVInput;
