export interface Props {
	service: string;
	start: number;
	end: number;
	step: number;
	selectedTags: string;
}

export interface DBOverView {
	avgDuration: number;
	callRate: number;
	externalHttpUrl: string;
	numCalls: number;
	timestamp: number;
}

export type PayloadProps = DBOverView[];
