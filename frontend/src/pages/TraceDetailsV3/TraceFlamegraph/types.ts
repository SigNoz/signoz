import { Dispatch, SetStateAction } from 'react';
import { Event, FlamegraphSpan } from 'types/api/trace/getTraceFlamegraph';

export interface ITraceMetadata {
	startTime: number;
	endTime: number;
}

export interface FlamegraphCanvasProps {
	spans: FlamegraphSpan[][];
	firstSpanAtFetchLevel: string;
	setFirstSpanAtFetchLevel: Dispatch<SetStateAction<string>>;
	onSpanClick: (spanId: string) => void;
	traceMetadata: ITraceMetadata;
}

export interface SpanRect {
	span: FlamegraphSpan;
	x: number;
	y: number;
	width: number;
	height: number;
	level: number;
}

export interface EventRect {
	event: Event;
	span: FlamegraphSpan;
	cx: number;
	cy: number;
	halfSize: number;
}
