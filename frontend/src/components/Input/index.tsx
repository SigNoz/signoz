import { Form, Input, InputProps } from 'antd';
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
	label,
	labelOnTop,
	addonBefore,
	...props
}: InputComponentProps): JSX.Element => (
	<Form.Item labelCol={{ span: labelOnTop ? 24 : 4 }} label={label}>
		<Input
			placeholder={placeholder}
			type={type}
			onChange={onChangeHandler}
			value={value}
			ref={ref}
			size={size}
			addonBefore={addonBefore}
			onBlur={onBlurHandler}
			onPressEnter={onPressEnterHandler}
			{...props}
		/>
	</Form.Item>
);

interface InputComponentProps extends InputProps {
	value: InputProps['value'];
	type?: InputProps['type'];
	onChangeHandler?: React.ChangeEventHandler<HTMLInputElement>;
	placeholder?: InputProps['placeholder'];
	ref?: React.LegacyRef<Input>;
	size?: InputProps['size'];
	onBlurHandler?: React.FocusEventHandler<HTMLInputElement>;
	onPressEnterHandler?: React.KeyboardEventHandler<HTMLInputElement>;
	label?: string;
	labelOnTop?: boolean;
	addonBefore?: React.ReactNode;
}

export default InputComponent;
