import { TraceReducer } from 'types/reducer/trace';

export interface Props {
	start: number;
	end: number;
	other: {
		[k: string]: string[];
	};
	isFilterExclude: TraceReducer['isFilterExclude'];
}

interface TagsKeys {
	tagKeys: string;
}

export type PayloadProps = TagsKeys[];
