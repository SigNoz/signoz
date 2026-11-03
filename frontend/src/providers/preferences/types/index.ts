import { TelemetryFieldKey } from 'api/v5/v5';
import { LogViewMode, FontSize } from 'container/OptionsMenu/types';

import { PREFERENCE_SOURCE_PAGES } from '../constants';

export enum PreferenceMode {
	SAVED_VIEW = 'savedView',
	DIRECT = 'direct',
}

export type PreferenceSourcePage = (typeof PREFERENCE_SOURCE_PAGES)[number];

export interface PreferenceSlice {
	preferences: Preferences | null;
	loading: boolean;
	error: Error | null;
	updateColumns: (newColumns: TelemetryFieldKey[]) => void;
	updateFormatting: (newFormatting: FormattingOptions) => void;
}

export type PreferenceContextValue = Record<
	PreferenceSourcePage,
	PreferenceSlice
>;

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
