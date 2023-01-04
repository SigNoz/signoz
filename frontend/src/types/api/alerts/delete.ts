import { AlertDef } from './def';

export interface Props {
	id: AlertDef['id'];
}

export interface PayloadProps {
	status: string;
	data: string;
}
