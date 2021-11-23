import { Channels } from './getAll';

export interface Props {
	id: Channels['id'];
}

export interface PayloadProps {
	status: string;
	data: string;
}
