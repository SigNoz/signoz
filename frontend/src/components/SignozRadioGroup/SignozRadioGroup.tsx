import './SignozRadioGroup.styles.scss';

import { Radio } from 'antd';
import { RadioChangeEvent } from 'antd/es/radio';

interface Option {
	value: string;
	label: string | React.ReactNode;
	icon?: React.ReactNode;
}

interface SignozRadioGroupProps {
	value: string;
	options: Option[];
	onChange: (e: RadioChangeEvent) => void;
	className?: string;
	disabled?: boolean;
}

function SignozRadioGroup({
	value,
	options,
	onChange,
	className = '',
	disabled = false,
}: SignozRadioGroupProps): JSX.Element {
	return (
		<Radio.Group
			value={value}
			buttonStyle="solid"
			className={`signoz-radio-group ${className}`}
			onChange={onChange}
			disabled={disabled}
		>
			{options.map((option) => (
				<Radio.Button
					key={option.value}
					value={option.value}
					className={value === option.value ? 'selected_view tab' : 'tab'}
				>
					<div className="view-title-container">
						{option.icon && <div className="icon-container">{option.icon}</div>}
						{option.label}
					</div>
				</Radio.Button>
			))}
		</Radio.Group>
	);
}

SignozRadioGroup.defaultProps = {
	className: '',
	disabled: false,
};

export default SignozRadioGroup;
