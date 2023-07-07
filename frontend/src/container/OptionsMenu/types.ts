import { InputNumberProps, RadioProps, SelectProps } from 'antd';
import { LogViewMode } from 'container/LogsTable';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';

export interface OptionsQuery {
	selectColumns: BaseAutocompleteData[];
	maxLines: number;
	format: LogViewMode;
}

export interface InitialOptions
	extends Omit<Partial<OptionsQuery>, 'selectColumns'> {
	selectColumns?: string[];
}

export type OptionsMenuConfig = {
	format?: Pick<RadioProps, 'value' | 'onChange'>;
	maxLines?: Pick<InputNumberProps, 'value' | 'onChange'>;
	addColumn?: Pick<
		SelectProps,
		'options' | 'onSelect' | 'onFocus' | 'onSearch' | 'onBlur'
	> & {
		isFetching: boolean;
		value: BaseAutocompleteData[];
		onRemove: (key: string) => void;
	};
};
