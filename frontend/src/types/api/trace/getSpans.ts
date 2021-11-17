import { GlobalTime } from 'types/actions/globalTime';

export interface TraceTagItem {
	key: string;
	value: string;
}

export interface pushDStree {
	id: string;
	name: string;
	value: number;
	time: number;
	startTime: number;
	tags: TraceTagItem[];
	children: pushDStree[];
}

export type span = [
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
	pushDStree[],
];

export interface SpanList {
	events: span[];
	segmentID: string;
	columns: string[];
}

export type PayloadProps = SpanList[];

export interface Props {
	start: GlobalTime['minTime'];
	end: GlobalTime['maxTime'];
	lookback: string;
	service: string;
	operation: string;
	maxDuration: string;
	minDuration: string;
	kind: string;
	limit: string;
	tags: string;
}
