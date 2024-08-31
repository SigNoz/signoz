import { TagFilter } from '../queryBuilder/queryBuilderData';
import { AlertDef } from './def';

export interface GetTimelineTableRequestProps {
	id: AlertDef['id'];
	start: number;
	end: number;
	offset: number;
	limit: number;
	order: string;
	filters?: TagFilter;
	state?: string;
}
