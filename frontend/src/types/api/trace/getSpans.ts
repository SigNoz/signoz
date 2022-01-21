import { TraceReducer } from 'types/reducer/trace';

export interface Props {
	start: number;
	end: number;
	function: TraceReducer['selectedFunction'];
	step: number;
	groupBy: TraceReducer['selectedGroupBy'];
	selectedFilter: TraceReducer['selectedFilter'];
	selectedTags: TraceReducer['selectedTags'];
}

export interface PayloadProps {
	items: Record<number, SpanData>;
}

interface SpanData {
	timestamp: number;
	value: number;
}
