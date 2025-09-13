import { Labels } from 'types/api/alerts/def';

export interface LabelsInputProps {
	labels: Labels;
	onLabelsChange: (labels: Labels) => void;
}

export interface LabelInputState {
	key: string;
	value: string;
	isKeyInput: boolean;
}
