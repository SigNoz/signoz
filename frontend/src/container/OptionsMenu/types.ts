import { InputNumberProps, RadioProps } from 'antd';
import { ComboboxSimpleItem } from '@signozhq/ui/combobox';
import { TelemetryFieldKey } from 'api/v5/v5';
import { LogViewMode } from 'container/LogsTable';

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
	selectColumns: TelemetryFieldKey[];
	maxLines: number;
	format: LogViewMode;
	fontSize: FontSize;
	version?: number;
}

export interface InitialOptions extends Omit<
	Partial<OptionsQuery>,
	'selectColumns'
> {
	selectColumns?: string[];
}

export type OptionsMenuConfig = {
	format?: Pick<RadioProps, 'value'> & {
		onChange: (value: LogViewMode) => void;
	};
	maxLines?: Pick<InputNumberProps, 'value' | 'onChange'>;
	fontSize?: FontSizeProps;
	addColumn?: {
		options: ComboboxSimpleItem[];
		onSelect: (value: string) => void;
		onFocus?: () => void;
		onBlur?: () => void;
		onSearch?: (value: string) => void;
		isFetching: boolean;
		value: TelemetryFieldKey[];
		onRemove: (key: string) => void;
	};
};
