import { AlertDef } from './def';

export interface Props {
	silenced: boolean;
	inhibited: boolean;
	active: boolean;
	[key: string]: string | boolean;
}
export interface Group {
	alerts: AlertDef[];
	label: AlertDef['labels'];
	receiver: {
		[key: string]: string;
	};
}

export type PayloadProps = Group[];
