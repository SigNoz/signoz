import { InputNumberProps, RadioProps, SelectProps } from 'antd';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';

export interface OptionsQuery {
	selectColumns: BaseAutocompleteData[];
	maxLines: number;
	format: 'default' | 'row' | 'column';
}

export interface InitialOptions
	extends Omit<Partial<OptionsQuery>, 'selectColumns'> {
	selectColumns?: string[];
}

export type OptionsMenuConfig = {
	format?: Pick<RadioProps, 'value' | 'onChange'>;
	maxLines?: Pick<InputNumberProps, 'value' | 'onChange'>;
	addColumn?: Pick<SelectProps, 'options' | 'onChange'> & {
		value: BaseAutocompleteData[];
		onRemove: (key: string) => void;
	};
};
