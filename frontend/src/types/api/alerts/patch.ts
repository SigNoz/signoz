import { GettableAlert } from './get';

export type PayloadProps = GettableAlert;

export interface PatchProps {
	disabled?: boolean;
}

export interface Props {
	id?: string;
	data: PatchProps;
}
