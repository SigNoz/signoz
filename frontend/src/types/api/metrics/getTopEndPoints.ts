export interface TopEndPoints {
	name: string;
	numCalls: number;
	p50: number;
	p95: number;
	p99: number;
}

export interface Props {
	service: string;
	start: number;
	end: number;
}

export type PayloadProps = TopEndPoints[];
