import { Dashboard } from './getAll';

export type Props = {
	title: Dashboard['data']['title'];
	uploadedGrafana: boolean;
	version?: string;
};

export interface PayloadProps {
	data: Dashboard;
	status: string;
}
