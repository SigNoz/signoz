import { MutableRefObject } from 'react';

export interface VariablesSettingsTab {
	resetState: () => void;
}

export type VariablesSettingsTabHandle = MutableRefObject<VariablesSettingsTab | null>;
