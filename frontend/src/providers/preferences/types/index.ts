import { TelemetryFieldKey } from 'api/v5/v5';
import { LogViewMode } from 'container/LogsTable';
import { FontSize } from 'container/OptionsMenu/types';

export enum PreferenceMode {
	SAVED_VIEW = 'savedView',
	DIRECT = 'direct',
}

export interface PreferenceSlice {
	preferences: Preferences | null;
	loading: boolean;
	error: Error | null;
	updateColumns: (newColumns: TelemetryFieldKey[]) => void;
	updateFormatting: (newFormatting: FormattingOptions) => void;
}

export interface PreferenceContextValue {
	logs: PreferenceSlice;
	traces: PreferenceSlice;
}

export interface FormattingOptions {
	maxLines?: number;
	format?: LogViewMode;
	fontSize?: FontSize;
	version?: number;
}

export interface Preferences {
	columns: TelemetryFieldKey[];
	formatting?: FormattingOptions;
}
