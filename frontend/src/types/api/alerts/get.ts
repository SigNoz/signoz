import { AlertDef } from './def';

export interface Props {
	id: AlertDef['id'];
}

export type PayloadProps = {
	data: AlertDef;
};
