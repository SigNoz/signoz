import { LogViewMode } from 'container/LogsTable';
import { FontSize } from 'container/OptionsMenu/types';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource } from 'types/common/queryBuilder';

export enum PreferenceMode {
	SAVED_VIEW = 'savedView',
	DIRECT = 'direct',
}

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
	format?: LogViewMode;
	fontSize?: FontSize;
	version?: number;
}

export interface Preferences {
	columns: BaseAutocompleteData[];
	formatting?: FormattingOptions;
}
