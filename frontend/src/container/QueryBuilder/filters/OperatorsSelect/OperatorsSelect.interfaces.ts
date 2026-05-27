import { ComboboxSimpleProps } from '@signozhq/ui/combobox';
import { SelectOption } from 'types/common/select';

export type OperatorsSelectProps = Omit<
	ComboboxSimpleProps,
	'onChange' | 'value' | 'items'
> & {
	operators: SelectOption<string, string>[];
	onChange: (value: string) => void;
	value: string;
	disabled?: boolean;
};
