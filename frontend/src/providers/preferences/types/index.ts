import { TelemetryFieldKey } from 'api/v5/v5';
import { LogViewMode, FontSize } from 'container/OptionsMenu/types';
import { DataSource } from 'types/common/queryBuilder';

export enum PreferenceMode {
	SAVED_VIEW = 'savedView',
	DIRECT = 'direct',
}

/** AI Explorer tabs; their queries still run on the traces data source. */
export enum AIObservabilityPreference {
	LIST = 'ai_observability_list',
	TRACE = 'ai_observability_trace',
}

/** Whose preferences: a data source, or an explorer sharing one with another. */
export type PreferenceDataSource = DataSource | AIObservabilityPreference;

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
	[AIObservabilityPreference.LIST]: PreferenceSlice;
	[AIObservabilityPreference.TRACE]: PreferenceSlice;
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
