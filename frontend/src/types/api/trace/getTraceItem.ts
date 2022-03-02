export interface Props {
	id: string;
}

export interface PayloadProps {
	[id: string]: {
		events: Span[];
		segmentID: string;
		columns: string[];
	};
}

export type Span = [
	number,
	string,
	string,
	string,
	string,
	string,
	string,
	string | string[],
	string | string[],
	string | string[],
	ITraceTree[],
];

export interface ITraceTree {
	id: string;
	name: string;
	value: number;
	time: number;
	startTime: number;
	tags: ITraceTag[];
	children: ITraceTree[];
	parent?: ITraceTree;
	serviceName: string;
	serviceColour: string;
	hasError?: boolean;
	error?: ITraceTag[];
}

export interface ITraceTag {
	key: string;
	value: string;
}
