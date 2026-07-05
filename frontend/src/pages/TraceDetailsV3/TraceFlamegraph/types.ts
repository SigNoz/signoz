import {
	SpantypesEventDTO as FlamegraphEvent,
	SpantypesFlamegraphSpanDTO as FlamegraphSpan,
} from 'api/generated/services/sigNoz.schemas';
import { Dispatch, SetStateAction } from 'react';

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
	// Resting fill color for the current colour-by grouping. Optional: only the
	// draw path sets it; consumers (e.g. the e2e colour-by hook) read it.
	color?: string;
}

export interface EventRect {
	event: FlamegraphEvent;
	span: FlamegraphSpan;
	cx: number;
	cy: number;
	halfSize: number;
}
