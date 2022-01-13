import { TraceFilterEnum } from 'types/reducer/trace';

export interface Props {
	start: string;
	end: string;
	getFilters: string[];
	other: {
		[k: string]: string[];
	};
}

export interface PayloadProps {
	[key: string]: Record<string, string>;
}
