import { Form, Input, InputProps, InputRef } from 'antd';
import {
	ChangeEventHandler,
	FocusEventHandler,
	KeyboardEventHandler,
	LegacyRef,
	ReactNode,
	Ref,
} from 'react';

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
				ref={ref as Ref<InputRef>}
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
	onChangeHandler?: ChangeEventHandler<HTMLInputElement>;
	placeholder?: InputProps['placeholder'];
	ref?: LegacyRef<InputRef>;
	size?: InputProps['size'];
	onBlurHandler?: FocusEventHandler<HTMLInputElement>;
	onPressEnterHandler?: KeyboardEventHandler<HTMLInputElement>;
	label?: string;
	labelOnTop?: boolean;
	addonBefore?: ReactNode;
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
