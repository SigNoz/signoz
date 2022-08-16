import { AlertDef } from './def';

export interface Props {
	id: AlertDef['id'];
}

export interface GettableAlert extends AlertDef {
	id: number;
	alert: string;
	state: string;
	disabled: boolean;
}

export type PayloadProps = {
	data: GettableAlert;
};
