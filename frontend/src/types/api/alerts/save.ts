import { AlertDef } from './def';

export type PayloadProps = {
	status: string;
	data: {
		id: string;
	};
};

export interface Props {
	id?: number;
	data: AlertDef;
}
