import type { ReactNode } from 'react';
import { Labels } from 'types/api/alerts/def';

export interface LabelsInputProps {
	labels: Labels;
	onLabelsChange: (labels: Labels) => void;
	validateLabelsKey: (key: string) => string | null;
	disabled?: boolean;
	/** Shown on Add labels while disabled. */
	disabledTooltip?: ReactNode;
}

export interface LabelInputState {
	key: string;
	value: string;
	isKeyInput: boolean;
}
