import { AlertDef } from './def';

export interface Filters {
	[k: string]: string | Record<string, unknown>[];
}

export interface GetTimelineGraphRequestProps {
	id: AlertDef['id'];
	start: number;
	end: number;
}
