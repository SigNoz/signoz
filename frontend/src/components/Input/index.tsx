import { Form, Input, InputProps, InputRef } from 'antd';
import React from 'react';

function InputComponent({
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
}: InputComponentProps): JSX.Element {
	return (
		<Form.Item labelCol={{ span: labelOnTop ? 24 : 4 }} label={label}>
			<Input
				placeholder={placeholder}
				type={type}
				onChange={onChangeHandler}
				value={value}
				ref={ref as React.Ref<InputRef>}
				size={size}
				addonBefore={addonBefore}
				onBlur={onBlurHandler}
				onPressEnter={onPressEnterHandler}
				// eslint-disable-next-line react/jsx-props-no-spreading
				{...props}
			/>
		</Form.Item>
	);
}

interface InputComponentProps extends InputProps {
	value: InputProps['value'];
	type?: InputProps['type'];
	onChangeHandler?: React.ChangeEventHandler<HTMLInputElement>;
	placeholder?: InputProps['placeholder'];
	ref?: React.LegacyRef<InputRef>;
	size?: InputProps['size'];
	onBlurHandler?: React.FocusEventHandler<HTMLInputElement>;
	onPressEnterHandler?: React.KeyboardEventHandler<HTMLInputElement>;
	label?: string;
	labelOnTop?: boolean;
	addonBefore?: React.ReactNode;
}

InputComponent.defaultProps = {
	type: undefined,
	onChangeHandler: undefined,
	placeholder: undefined,
	ref: undefined,
	size: undefined,
	onBlurHandler: undefined,
	onPressEnterHandler: undefined,
	label: undefined,
	labelOnTop: undefined,
	addonBefore: undefined,
};

export default InputComponent;
