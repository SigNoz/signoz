import { AlertDef } from './def';

export type PayloadProps = {
	status: string;
	data: string;
};

export interface Props {
	id?: number;
	data: AlertDef;
}
