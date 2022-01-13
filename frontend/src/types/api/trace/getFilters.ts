import { TraceFilterEnum } from 'types/reducer/trace';

export interface Props {
	start: string;
	end: string;
	getFilters: string[];
	[key: string]: string[] | string;
}

export interface PayloadProps {
	[key: string]: Record<string, string>;
}
