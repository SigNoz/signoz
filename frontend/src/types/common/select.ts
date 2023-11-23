import { ReactNode } from 'react';

export type SelectOption<Value, Label extends unknown = string> = {
	value: Value;
	label: Label;
	dataType?: string;
};

export type ExtendedSelectOption = {
	disabled?: boolean;
	key: string;
	label: ReactNode;
	title?: string;
	value: string;
};
