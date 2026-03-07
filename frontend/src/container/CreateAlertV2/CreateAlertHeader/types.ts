import { Labels } from 'types/api/alerts/def';

export interface LabelsInputProps {
	labels: Labels;
	onLabelsChange: (labels: Labels) => void;
	validateLabelsKey: (key: string) => string | null;
}

export interface LabelInputState {
	key: string;
	value: string;
	isKeyInput: boolean;
}
