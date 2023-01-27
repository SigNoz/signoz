import { TraceReducer } from 'types/reducer/trace';

export interface Props {
	start: number;
	end: number;
	other: {
		[k: string]: string[];
	};
	isFilterExclude: TraceReducer['isFilterExclude'];
}

export interface PayloadProps {
	stringTagKeys: string[];
	numberTagKeys: string[];
	boolTagKeys: string[];
}
