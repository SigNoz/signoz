import { Dashboard } from './getAll';

export type Props = {
	id: Dashboard['id'];
	lock: boolean;
};

export interface PayloadProps {
	data: null;
	status: string;
}
