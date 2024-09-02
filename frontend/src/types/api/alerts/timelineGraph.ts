import { AlertDef } from './def';

export interface GetTimelineGraphRequestProps {
	id: AlertDef['id'];
	start: number;
	end: number;
}
