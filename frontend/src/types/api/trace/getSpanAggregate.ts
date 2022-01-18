import { TraceReducer } from 'types/reducer/trace';

export interface Props {
	start: number;
	end: number;
	tags: TraceReducer['selectedTags'];
	limit: number;
	offset: number;
}

export type PayloadProps = TraceReducer['spansAggregate']['data'];
