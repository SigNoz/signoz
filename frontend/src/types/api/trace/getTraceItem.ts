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
		isSubTree: boolean;
		startTimestampMillis: number;
		endTimestampMillis: number;
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
	string,
	string,
	string,
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
	spanKind: string;
	statusCodeString: string;
	statusMessage: string;
	childReferences?: Record<string, string>[];
	nonChildReferences?: Record<string, string>[];
	// For internal use
	isProcessed?: boolean;
}

export interface ITraceTag {
	key: string;
	value: string;
}

export interface ITraceEvents {
	attributeMap: { event: string; [key: string]: string };
	name?: string;
	timeUnixNano: number;
}

export interface ITraceForest {
	spanTree: ITraceTree[];
	missingSpanTree: ITraceTree[];
}
