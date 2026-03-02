import { Dispatch, SetStateAction } from 'react';
import { FlamegraphSpan } from 'types/api/trace/getTraceFlamegraph';
import { Span } from 'types/api/trace/getTraceV2';

export interface ITraceMetadata {
	startTime: number;
	endTime: number;
}

export interface FlamegraphCanvasProps {
	spans: FlamegraphSpan[][];
	firstSpanAtFetchLevel: string;
	setFirstSpanAtFetchLevel: Dispatch<SetStateAction<string>>;
	traceMetadata: ITraceMetadata;
	selectedSpan: Span | undefined;
}

export interface SpanRect {
	span: FlamegraphSpan;
	x: number;
	y: number;
	width: number;
	height: number;
	level: number;
}
