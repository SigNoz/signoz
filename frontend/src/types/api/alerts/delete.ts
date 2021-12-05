import { Alerts } from './getAll';

export interface Props {
	id: Alerts['id'];
}

export interface PayloadProps {
	status: string;
	data: string;
}
