import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource } from 'types/common/queryBuilder';

export type PreferenceMode = 'savedView' | 'direct';

export interface PreferenceContextValue {
	preferences: Preferences | null;
	loading: boolean;
	error: Error | null;
	mode: PreferenceMode;
	savedViewId?: string;
	dataSource: DataSource;
	updateColumns: (newColumns: BaseAutocompleteData[]) => void;
	updateFormatting: (newFormatting: FormattingOptions) => void;
}

export interface FormattingOptions {
	maxLines?: number;
	format?: 'raw' | 'table';
	fontSize?: 'small' | 'medium' | 'large';
	version?: number;
}

export interface Preferences {
	columns: BaseAutocompleteData[];
	formatting?: FormattingOptions;
}
