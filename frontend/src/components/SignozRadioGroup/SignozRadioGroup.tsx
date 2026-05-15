import { ToggleGroup, ToggleGroupItem } from '@signozhq/ui/toggle-group';

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
		<ToggleGroup
			type="single"
			value={value}
			className={`signoz-radio-group ${className}`}
			onChange={onChange}
			disabled={disabled}
		>
			{options.map((option) => (
				<ToggleGroupItem
					key={option.value}
					value={option.value}
					className={value === option.value ? 'selected_view tab' : 'tab'}
				>
					<div className="view-title-container">
						{option.icon && <div className="icon-container">{option.icon}</div>}
						{option.label}
					</div>
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	);
}

SignozRadioGroup.defaultProps = {
	className: '',
	disabled: false,
};

export default SignozRadioGroup;
