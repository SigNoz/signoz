export type SelectOption<Value, Label extends unknown = string> = {
	value: Value;
	label: Label;
	dataType?: string;
};

export type ExtendedSelectOption = {
	disabled?: boolean;
	key: string;
	label: string;
	title?: string;
	value: string;
};
