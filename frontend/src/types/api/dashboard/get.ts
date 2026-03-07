import { Dashboard } from './getAll';

export type Props = {
	id: Dashboard['id'];
};

export interface PayloadProps {
	data: Dashboard;
	status: string;
}
