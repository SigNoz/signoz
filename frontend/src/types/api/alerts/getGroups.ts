import { Alerts } from './getAll';

export interface Props {
	silenced: boolean;
	inhibited: boolean;
	active: boolean;
	[key: string]: string | boolean;
}
export interface Group {
	alerts: Alerts[];
	label: Alerts['labels'];
	receiver: {
		[key: string]: string;
	};
}

export type PayloadProps = Group[];
