import { SelectProps } from 'antd';

export interface OptionData {
	label: string;
	value?: string;
	disabled?: boolean;
	className?: string;
	style?: React.CSSProperties;
	options?: OptionData[];
	type?: 'defined' | 'custom' | 'regex';
}

export interface CustomSelectProps extends Omit<SelectProps, 'options'> {
	placeholder?: string;
	className?: string;
	loading?: boolean;
	onSearch?: (value: string) => void;
	options?: OptionData[];
	defaultActiveFirstOption?: boolean;
	noDataMessage?: string;
	onClear?: () => void;
	getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement;
	dropdownRender?: (menu: React.ReactElement) => React.ReactElement;
	highlightSearch?: boolean;
	placement?: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
	popupMatchSelectWidth?: boolean;
	errorMessage?: string | null;
	allowClear?: SelectProps['allowClear'];
	onRetry?: () => void;
	showIncompleteDataMessage?: boolean;
	showRetryButton?: boolean;
	isDynamicVariable?: boolean;
}

export interface CustomTagProps {
	label: React.ReactNode;
	value: string;
	closable: boolean;
	onClose: () => void;
}

export interface CustomMultiSelectProps
	extends Omit<SelectProps<string[] | string>, 'options'> {
	placeholder?: string;
	className?: string;
	loading?: boolean;
	onSearch?: (value: string) => void;
	options?: OptionData[];
	defaultActiveFirstOption?: boolean;
	dropdownMatchSelectWidth?: boolean | number;
	noDataMessage?: string;
	onClear?: () => void;
	enableAllSelection?: boolean;
	getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement;
	dropdownRender?: (menu: React.ReactElement) => React.ReactElement;
	highlightSearch?: boolean;
	errorMessage?: string | null;
	popupClassName?: string;
	placement?: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
	maxTagCount?: number;
	allowClear?: SelectProps['allowClear'];
	onRetry?: () => void;
	maxTagTextLength?: number;
	showIncompleteDataMessage?: boolean;
	showLabels?: boolean;
	enableRegexOption?: boolean;
	isDynamicVariable?: boolean;
	showRetryButton?: boolean;
}
