import { Input, InputProps } from 'antd';
import { ChangeEventHandler, useState } from 'react';

function CSVInput({ value, onChange, ...otherProps }: InputProps): JSX.Element {
	const [inputValue, setInputValue] = useState(
		((value as string[]) || []).join(', '),
	);

	const onChangeHandler = (onChange as unknown) as (v: string[]) => void;

	const onInputChange: ChangeEventHandler<HTMLInputElement> = (e) => {
		const newValue = e.target.value;
		setInputValue(newValue);

		if (onChangeHandler) {
			const splitValues = newValue.split(',').map((v) => v.trim());
			onChangeHandler(splitValues);
		}
	};

	// eslint-disable-next-line react/jsx-props-no-spreading
	return <Input value={inputValue} onChange={onInputChange} {...otherProps} />;
}

export default CSVInput;
