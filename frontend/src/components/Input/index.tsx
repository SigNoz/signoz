import { Input, InputProps } from 'antd';
import React from 'react';

const InputComponent = ({
	value,
	type = 'text',
	onChangeHandler,
	placeholder,
	ref,
	size = 'small',
	onBlurHandler,
	onPressEnterHandler,
}: InputComponentProps): JSX.Element => (
	<Input
		placeholder={placeholder}
		type={type}
		onChange={onChangeHandler}
		value={value}
		ref={ref}
		size={size}
		onBlur={onBlurHandler}
		onPressEnter={onPressEnterHandler}
	/>
);

interface InputComponentProps {
	value: InputProps['value'];
	type?: InputProps['type'];
	onChangeHandler: React.ChangeEventHandler<HTMLInputElement>;
	placeholder?: InputProps['placeholder'];
	ref?: React.LegacyRef<Input>;
	size?: InputProps['size'];
	onBlurHandler?: React.FocusEventHandler<HTMLInputElement>;
	onPressEnterHandler?: React.KeyboardEventHandler<HTMLInputElement>;
}

export default InputComponent;
