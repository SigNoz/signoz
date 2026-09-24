import { ToggleGroup } from '@signozhq/ui/toggle-group';

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
	disabled?: boolean;
	disabledTooltip?: string;
}

function SignozRadioGroup({
	value,
	options,
	onChange,
	disabled = false,
	disabledTooltip,
}: SignozRadioGroupProps): JSX.Element {
	return (
		<ToggleGroup
			variant="outlined"
			color="secondary"
			size="sm"
			type="single"
			value={value}
			onChange={onChange}
			disabled={disabled}
			disabledTooltip={disabledTooltip}
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
	disabled: false,
	disabledTooltip: undefined,
};

export default SignozRadioGroup;
