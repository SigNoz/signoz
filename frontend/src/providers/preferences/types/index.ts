import { TelemetryFieldKey } from 'api/v5/v5';
import { LogViewMode } from 'container/OptionsMenu/types';
import { FontSize } from 'container/OptionsMenu/types';
import { DataSource } from 'types/common/queryBuilder';

// AI Observability queries run on traces, so its slice needs a key of its own.
export const AI_OBSERVABILITY_PREFERENCE_SOURCE = 'ai_observability';

export type PreferenceSource =
	| DataSource
	| typeof AI_OBSERVABILITY_PREFERENCE_SOURCE;

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
	aiObservability: PreferenceSlice;
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
