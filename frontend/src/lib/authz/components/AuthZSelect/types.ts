import type { SelectProps } from 'antd';

export interface AuthZSelectOption {
	value: string;
	label: string;
	disabled: boolean;
	/** Why it is disabled: a denial, or that the check is still running. */
	reason?: string;
	/** `reason` is a denial, shown on the red tooltip. */
	denied: boolean;
	testId: string;
}

export type AuthZSelectProps = Omit<
	SelectProps<string[]>,
	'options' | 'optionRender' | 'optionLabelProp' | 'mode'
> & {
	options: AuthZSelectOption[];
};
