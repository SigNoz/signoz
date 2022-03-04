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
	event?: ITraceEvents[];
}

export interface ITraceTag {
	key: string;
	value: string;
}

interface ITraceEvents {
	attributeMap: { event: string; [key: string]: string };
	name?: string;
}
