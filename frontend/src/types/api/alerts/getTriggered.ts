import { Alerts } from './getAll';

export interface Props {
	silenced: boolean;
	inhibited: boolean;
	active: boolean;
	[key: string]: string | boolean;
}

export type PayloadProps = Alerts[] | [];
