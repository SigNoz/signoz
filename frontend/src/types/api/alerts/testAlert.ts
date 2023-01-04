import { AlertDef } from 'types/api/alerts/def';

export interface Props {
	data: AlertDef;
}

export interface PayloadProps {
	alertCount: number;
	message: string;
}
