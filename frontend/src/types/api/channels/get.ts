import { Channels } from './getAll';

export interface Props {
	id: Channels['id'];
}

export type PayloadProps = {
	data: Channels;
	status: string;
};
