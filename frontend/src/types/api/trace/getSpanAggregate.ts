import { TraceReducer } from 'types/reducer/trace';

export interface Props {
	start: number;
	end: number;
	selectedFilter: TraceReducer['selectedFilter'];
	limit: number;
	offset: number;
	selectedTags: TraceReducer['selectedTags'];
	order?: TraceReducer['spansAggregate']['order'];
	isFilterExclude: TraceReducer['isFilterExclude'];
	orderParam: TraceReducer['spansAggregate']['orderParam'];
	spanKind?: TraceReducer['spanKind'];
}

export type PayloadProps = {
	spans: TraceReducer['spansAggregate']['data'];
	totalSpans: number;
};
