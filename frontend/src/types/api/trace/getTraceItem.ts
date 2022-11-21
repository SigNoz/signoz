export interface Props {
	id: string;
}

export interface GetTraceItemProps {
	id: string;
	spanId: string | null;
	levelUp: string | null;
	levelDown: string | null;
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
	string[],
	string[],
	string[],
	string[],
	boolean,
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
	isMissing?: boolean;
	// For internal use
	isProcessed?: boolean;
	references?: Record<string, string>[];
}

export interface ITraceTag {
	key: string;
	value: string;
}

interface ITraceEvents {
	attributeMap: { event: string; [key: string]: string };
	name?: string;
}

export interface ITraceForest {
	spanTree: ITraceTree[];
	missingSpanTree: ITraceTree[];
}
