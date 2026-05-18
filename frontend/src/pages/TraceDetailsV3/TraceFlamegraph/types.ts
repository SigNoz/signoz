import { Dispatch, SetStateAction } from 'react';
import { Event, FlamegraphSpan } from 'types/api/trace/getTraceFlamegraph';

import { VisualLayout } from './computeVisualLayout';

export interface ITraceMetadata {
	startTime: number;
	endTime: number;
}

export interface FlamegraphCanvasProps {
	layout: VisualLayout;
	firstSpanAtFetchLevel: string;
	setFirstSpanAtFetchLevel: Dispatch<SetStateAction<string>>;
	onSpanClick: (spanId: string) => void;
	traceMetadata: ITraceMetadata;
	filteredSpanIds: string[];
	isFilterActive: boolean;
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
