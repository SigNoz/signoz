import { Dashboard } from './getAll';

export type Props = {
	uuid: Dashboard['uuid'];
	title: Dashboard['data']['title'];
};

export type PayloadProps = Dashboard;
