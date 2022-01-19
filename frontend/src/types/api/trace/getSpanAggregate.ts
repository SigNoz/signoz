import { TraceReducer } from 'types/reducer/trace';

export interface Props {
	start: number;
	end: number;
	selectedFilter: TraceReducer['selectedFilter'];
	limit: number;
	offset: number;
}

export type PayloadProps = {
	spans: TraceReducer['spansAggregate']['data'];
	totalSpans: number;
};
