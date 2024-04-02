export interface IResourceAttribute {
	id: string;
	tagKey: string;
	operator: string;
	tagValue: string[];
}

export interface IOption {
	label: string;
	value: string;
}

type Modes = 'tags' | 'multiple';

export interface OptionsData {
	mode?: Modes;
	options: IOption[];
}

export interface IResourceAttributeProps {
	queries: IResourceAttribute[];
	staging: string[];
	handleClearAll: VoidFunction;
	handleClose: (id: string) => void;
	handleBlur: VoidFunction;
	handleFocus: VoidFunction;
	loading: boolean;
	handleChange: (value: string) => void;
	selectedQuery: string[];
	optionsData: OptionsData;
	handleEnvironmentChange: (environments: string[]) => void;
}
