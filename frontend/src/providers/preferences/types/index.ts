import { TelemetryFieldKey } from 'api/v5/v5';
import { LogViewMode } from 'container/OptionsMenu/types';
import { FontSize } from 'container/OptionsMenu/types';
import { DataSource } from 'types/common/queryBuilder';

// AI Observability queries run on traces, so its slice needs a key of its own.
export const AI_OBSERVABILITY_PREFERENCE_SOURCE = 'ai_observability';

// The trace view shares a page with the list view, so it keeps its columns under a URL param of its own.
export const AI_OBSERVABILITY_TRACE_VIEW_PREFERENCE_SOURCE =
	'ai_observability_trace_view';
export const AI_OBSERVABILITY_TRACE_VIEW_URL_OPTIONS = 'traceViewOptions';

export type PreferenceSource =
	| DataSource
	| typeof AI_OBSERVABILITY_PREFERENCE_SOURCE
	| typeof AI_OBSERVABILITY_TRACE_VIEW_PREFERENCE_SOURCE;

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
	aiObservabilityTraceView: PreferenceSlice;
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
