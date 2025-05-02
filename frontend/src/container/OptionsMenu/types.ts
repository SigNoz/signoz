import { InputNumberProps, RadioProps, SelectProps } from 'antd';
import { LogViewMode } from 'container/LogsTable';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';

export enum FontSize {
	SMALL = 'small',
	MEDIUM = 'medium',
	LARGE = 'large',
}

interface FontSizeProps {
	value: FontSize;
	onChange: (val: FontSize) => void;
}
export interface OptionsQuery {
	selectColumns: BaseAutocompleteData[];
	maxLines: number;
	format: LogViewMode;
	fontSize: FontSize;
	version?: number;
}

export interface InitialOptions
	extends Omit<Partial<OptionsQuery>, 'selectColumns'> {
	selectColumns?: string[];
}

export type OptionsMenuConfig = {
	format?: Pick<RadioProps, 'value'> & {
		onChange: (value: LogViewMode) => void;
	};
	maxLines?: Pick<InputNumberProps, 'value' | 'onChange'>;
	fontSize?: FontSizeProps;
	addColumn?: Pick<
		SelectProps,
		'options' | 'onSelect' | 'onFocus' | 'onSearch' | 'onBlur'
	> & {
		isFetching: boolean;
		value: BaseAutocompleteData[];
		onRemove: (key: string) => void;
	};
};
