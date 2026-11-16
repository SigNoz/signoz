import { TelemetryFieldKey } from 'api/v5/v5';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { LogViewMode, FontSize } from 'container/OptionsMenu/types';

import { PREFERENCE_SOURCE_PAGES } from '../constants';

export enum PreferenceMode {
	SAVED_VIEW = 'savedView',
	DIRECT = 'direct',
}

export type PreferenceSourcePage = (typeof PREFERENCE_SOURCE_PAGES)[number];

export type PanelColumns = Partial<Record<PANEL_TYPES, TelemetryFieldKey[]>>;

export interface PreferenceSlice {
	preferences: Preferences | null;
	loading: boolean;
	error: Error | null;
	// `panelType` defaults to the open panel.
	updateColumns: (
		newColumns: TelemetryFieldKey[],
		panelType?: PANEL_TYPES,
	) => void;
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
	// Set by source pages whose panels each keep their own columns: the panel
	// these columns belong to.
	panelType?: PANEL_TYPES;
}
