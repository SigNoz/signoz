import { ToggleGroupSimple } from '@signozhq/ui/toggle-group';

import './SignozRadioGroup.styles.scss';

interface Option {
	value: string;
	label: string | React.ReactNode;
	icon?: React.ReactNode;
}

interface SignozRadioGroupProps {
	value: string;
	options: Option[];
	onChange: (value: string) => void;
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
		<ToggleGroupSimple
			type="single"
			value={value}
			className={`signoz-radio-group ${className}`}
			onChange={onChange}
			disabled={disabled}
			items={options.map((option) => ({
				value: option.value,
				label: (
					<div className="view-title-container">
						{option.icon && <div className="icon-container">{option.icon}</div>}
						{option.label}
					</div>
				),
			}))}
		/>
	);
}

SignozRadioGroup.defaultProps = {
	className: '',
	disabled: false,
};

export default SignozRadioGroup;
