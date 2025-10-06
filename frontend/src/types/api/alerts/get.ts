import { AlertDef } from './def';

export interface Props {
	id: AlertDef['id'];
}

export interface GettableAlert extends AlertDef {
	id: string;
	alert: string;
	state: string;
	disabled: boolean;
	createAt: string;
	createBy: string;
	updateAt: string;
	updateBy: string;
	schemaVersion: string;
}

export type PayloadProps = {
	data: GettableAlert;
};
